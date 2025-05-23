
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { 
  fetchServices, 
  fetchBarbers, 
  fetchFAQs, 
  fetchPromotions, 
  fetchLocations, 
  fetchWorkingHours,
  DbService,
  DbBarber,
  DbFAQ,
  DbPromotion,
  DbLocation,
  DbWorkingHours
} from '@/lib/supabase';

// Define message interface
export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function useChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [conversationContext, setConversationContext] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data from Supabase
  const [services, setServices] = useState<DbService[]>([]);
  const [barbers, setBarbers] = useState<DbBarber[]>([]);
  const [faqs, setFaqs] = useState<DbFAQ[]>([]);
  const [promotions, setPromotions] = useState<DbPromotion[]>([]);
  const [locations, setLocations] = useState<DbLocation[]>([]);
  const [workingHours, setWorkingHours] = useState<DbWorkingHours[]>([]);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const servicesData = await fetchServices();
        const barbersData = await fetchBarbers();
        const faqsData = await fetchFAQs();
        const promotionsData = await fetchPromotions();
        const locationsData = await fetchLocations();
        const workingHoursData = await fetchWorkingHours();
        
        if (servicesData) setServices(servicesData);
        if (barbersData) setBarbers(barbersData);
        if (faqsData) setFaqs(faqsData);
        if (promotionsData) setPromotions(promotionsData);
        if (locationsData) setLocations(locationsData);
        if (workingHoursData) setWorkingHours(workingHoursData);
        
        setDataInitialized(true);
      } catch (error) {
        console.error("Error loading chatbot data:", error);
        toast({
          title: "Failed to load chatbot data",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Navigate to booking
  const navigateToBooking = useCallback(() => {
    setIsOpen(false);
    navigate('/booking');
  }, [navigate]);

  // Format services for display
  const formatServicesResponse = useCallback(() => {
    if (services.length === 0) return "I'm sorry, we couldn't load our service information right now.";
    
    return `💇‍♂️ Our Services:\n\n${services
      .map(service => `• **${service.name}** - $${service.price} (${service.duration_minutes} mins)\n  ${service.description || 'No description available.'}`)
      .join('\n\n')}`;
  }, [services]);

  // Find specific service information
  const findServiceInfo = useCallback((query: string) => {
    if (services.length === 0) return null;
    
    const normalizedQuery = query.toLowerCase();
    const matchingServices = services.filter(service => 
      service.name.toLowerCase().includes(normalizedQuery) ||
      (service.description && service.description.toLowerCase().includes(normalizedQuery))
    );
    
    if (matchingServices.length === 0) return null;
    
    if (matchingServices.length === 1) {
      const service = matchingServices[0];
      return `💇‍♂️ For a **${service.name}**, the price is $${service.price} and it takes about ${service.duration_minutes} minutes.\n\n${service.description || ''}\n\nWould you like to book an appointment for this service?`;
    }
    
    return `I found several services that match your query:\n\n${matchingServices
      .map(service => `• **${service.name}** - $${service.price} (${service.duration_minutes} mins)`)
      .join('\n')}`;
  }, [services]);

  // Get barber information by ID or name
  const getBarberInfo = useCallback((barberId?: string, barberName?: string) => {
    if (barbers.length === 0) return null;
    
    let barber: DbBarber | undefined;
    
    if (barberId) {
      barber = barbers.find(b => b.id === barberId);
    } else if (barberName) {
      // Case-insensitive partial name matching
      const normalizedName = barberName.toLowerCase();
      barber = barbers.find(b => 
        b.name.toLowerCase().includes(normalizedName)
      );
    }
    
    if (!barber) return null;
    
    return barber;
  }, [barbers]);

  // Format barbers for display
  const formatBarbersResponse = useCallback(() => {
    if (barbers.length === 0) return "I'm sorry, we couldn't load our barber information right now.";
    
    return `👨‍💼 Our Talented Barbers:\n\n${barbers
      .map(barber => `• **${barber.name}**\n  ${barber.bio || 'No bio available.'}`)
      .join('\n\n')}`;
  }, [barbers]);

  // Display barber details with specializations (if available)
  const formatBarberDetails = useCallback((barberName: string) => {
    const barber = getBarberInfo(undefined, barberName);
    
    if (!barber) {
      return `I'm sorry, I couldn't find information about a barber named "${barberName}".`;
    }
    
    return `👨‍💼 **${barber.name}**\n\n${barber.bio || 'No bio available.'}\n\n${barber.is_active ? '✅ Currently available for bookings' : '❌ Not currently available for bookings'}`;
  }, [getBarberInfo]);

  // Format location information
  const formatLocationResponse = useCallback(() => {
    if (locations.length === 0) return "I'm sorry, we couldn't load our location information right now.";
    
    const location = locations[0]; // Assuming the first location is the primary one
    return `📍 Location Information:\n\n**${location.name}**\n${location.address}\n${location.city}\n\n📱 Phone: ${location.phone || 'Not available'}\n📧 Email: ${location.email || 'Not available'}\n\nFeel free to visit us or book an appointment!`;
  }, [locations]);

  // Format working hours
  const formatHoursResponse = useCallback(() => {
    if (workingHours.length === 0) return "I'm sorry, we couldn't load our hours information right now.";
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sortedHours = [...workingHours].sort((a, b) => {
      // Ensure day_of_week is treated as a number for comparison
      const dayA = typeof a.day_of_week === 'number' ? a.day_of_week : parseInt(String(a.day_of_week), 10);
      const dayB = typeof b.day_of_week === 'number' ? b.day_of_week : parseInt(String(b.day_of_week), 10);
      return dayA - dayB;
    });
    
    return `⏰ Business Hours:\n\n${sortedHours
      .map(hour => {
        const dayIndex = typeof hour.day_of_week === 'number' ? hour.day_of_week : parseInt(String(hour.day_of_week), 10);
        if (hour.is_closed) {
          return `• **${dayNames[dayIndex]}**: Closed`;
        }
        return `• **${dayNames[dayIndex]}**: ${hour.open_time} - ${hour.close_time}`;
      })
      .join('\n')}`;
  }, [workingHours]);

  // Format promotions
  const formatPromotionsResponse = useCallback(() => {
    if (promotions.length === 0) return "I'm sorry, we don't have any active promotions at this time.";
    
    const currentDate = new Date();
    const activePromotions = promotions.filter(promo => 
      !promo.valid_until || new Date(promo.valid_until) > currentDate
    );
    
    if (activePromotions.length === 0) {
      return "I'm sorry, we don't have any active promotions at this time.";
    }
    
    return `🎉 Current Promotions:\n\n${activePromotions
      .map(promo => {
        const validUntil = promo.valid_until ? `Valid until: ${new Date(promo.valid_until).toLocaleDateString()}` : 'No expiration date';
        return `• **${promo.title}**\n  ${promo.details || 'No details available.'}\n  ${validUntil}`;
      })
      .join('\n\n')}`;
  }, [promotions]);

  // Get today's hours
  const getTodaysHours = useCallback(() => {
    if (workingHours.length === 0) return null;
    
    const today = new Date().getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    const todayHours = workingHours.find(hour => {
      const dayIndex = typeof hour.day_of_week === 'number' ? hour.day_of_week : parseInt(String(hour.day_of_week), 10);
      return dayIndex === today;
    });
    
    if (!todayHours) return null;
    
    if (todayHours.is_closed) {
      return "We're closed today.";
    }
    
    return `We're open today from ${todayHours.open_time} to ${todayHours.close_time}.`;
  }, [workingHours]);

  // Format FAQ response
  const formatFAQResponse = useCallback((query: string) => {
    if (faqs.length === 0) return null;
    
    // Find most relevant FAQ - improved implementation
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Calculate relevance score for each FAQ
    const scoredFaqs = faqs.map(faq => {
      const questionWords = faq.question.toLowerCase().split(/\s+/);
      const answerWords = faq.answer.toLowerCase().split(/\s+/);
      const allWords = [...new Set([...questionWords, ...answerWords])];
      
      let score = 0;
      // Score for exact phrase matches
      if (faq.question.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }
      if (faq.answer.toLowerCase().includes(query.toLowerCase())) {
        score += 5;
      }
      
      // Score for individual word matches
      for (const word of queryWords) {
        if (allWords.includes(word)) score += 1;
      }
      
      return { faq, score };
    });
    
    // Sort by score and get the best match
    scoredFaqs.sort((a, b) => b.score - a.score);
    const bestMatch = scoredFaqs[0];
    
    // Only return if we have a decent match
    if (bestMatch && bestMatch.score >= 2) {
      return `❓ ${bestMatch.faq.answer}`;
    }
    
    return null;
  }, [faqs]);

  // Process user input and generate response
  const processUserInput = useCallback((userInput: string) => {
    const normalizedInput = userInput.toLowerCase().trim();
    
    // Check for booking intent
    const bookingKeywords = ['book', 'appointment', 'schedule', 'reserve'];
    if (bookingKeywords.some(keyword => normalizedInput.includes(keyword))) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: "📅 Great! I can help you book an appointment. Would you like me to take you to our booking page?",
        timestamp: new Date()
      }]);
      
      // Add a second message with the booking prompt
      setTimeout(() => {
        setMessages(prevMessages => [...prevMessages, {
          id: uuidv4(),
          sender: 'bot',
          text: "Click the 'Book an appointment now' link below to get started, or I can answer any other questions about our services first.",
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 1000);
      
      // Set context for potential follow-up questions
      setConversationContext('booking');
      return;
    }

    // Check for haircut or price related questions first
    const hairKeywords = ['haircut', 'cut', 'hair', 'trim'];
    const priceKeywords = ['price', 'cost', 'how much', 'fee', 'charge', 'pricing'];
    
    const isHaircutQuery = hairKeywords.some(keyword => normalizedInput.includes(keyword));
    const isPriceQuery = priceKeywords.some(keyword => normalizedInput.includes(keyword));
    
    if (isHaircutQuery || isPriceQuery) {
      // If asking about a specific haircut
      const serviceInfo = findServiceInfo(userInput);
      
      if (serviceInfo) {
        setMessages(prevMessages => [...prevMessages, {
          id: uuidv4(),
          sender: 'bot',
          text: serviceInfo,
          timestamp: new Date()
        }]);
        setConversationContext('service');
        setIsTyping(false);
        return;
      }
      
      // If just asking about prices in general, show all services
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatServicesResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('services');
      setIsTyping(false);
      return;
    }

    // Check for barber-specific queries
    const barberKeywords = ['barber', 'stylist', 'staff'];
    const isBarberQuery = barberKeywords.some(keyword => normalizedInput.includes(keyword));
    
    if (isBarberQuery) {
      // Check if asking about a specific barber
      for (const barber of barbers) {
        if (normalizedInput.includes(barber.name.toLowerCase())) {
          setMessages(prevMessages => [...prevMessages, {
            id: uuidv4(),
            sender: 'bot',
            text: formatBarberDetails(barber.name),
            timestamp: new Date()
          }]);
          setConversationContext('barber');
          setIsTyping(false);
          return;
        }
      }
      
      // If just asking about barbers in general
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatBarbersResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('barbers');
      setIsTyping(false);
      return;
    }

    // Check for today-specific queries
    if (normalizedInput.includes('today') && 
        (normalizedInput.includes('open') || normalizedInput.includes('hour') || normalizedInput.includes('time'))) {
      const todaysHours = getTodaysHours();
      if (todaysHours) {
        setMessages(prevMessages => [...prevMessages, {
          id: uuidv4(),
          sender: 'bot',
          text: `⏰ ${todaysHours}`,
          timestamp: new Date()
        }]);
        setConversationContext('hours');
        setIsTyping(false);
        return;
      }
    }

    // Try to find a matching FAQ first
    const faqAnswer = formatFAQResponse(normalizedInput);
    if (faqAnswer) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: faqAnswer,
        timestamp: new Date()
      }]);
      setIsTyping(false);
      return;
    }
    
    // Handle different intents
    if (normalizedInput.includes('service') || normalizedInput.includes('price') || normalizedInput.includes('offer')) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatServicesResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('services');
    } 
    else if (normalizedInput.includes('barber') || normalizedInput.includes('stylist') || normalizedInput.includes('staff')) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatBarbersResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('barbers');
    }
    else if (normalizedInput.includes('location') || normalizedInput.includes('address') || normalizedInput.includes('where') || normalizedInput.includes('find')) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatLocationResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('location');
    }
    else if (normalizedInput.includes('hour') || normalizedInput.includes('time') || normalizedInput.includes('open') || normalizedInput.includes('close')) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatHoursResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('hours');
    }
    else if (normalizedInput.includes('promotion') || normalizedInput.includes('deal') || normalizedInput.includes('discount') || normalizedInput.includes('offer')) {
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: formatPromotionsResponse(),
        timestamp: new Date()
      }]);
      setConversationContext('promotions');
    }
    else if (normalizedInput.includes('yes') && conversationContext === 'booking') {
      // Handle confirmation for booking
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: "Great! I'll take you to our booking page now.",
        timestamp: new Date()
      }]);
      setTimeout(() => navigateToBooking(), 1500);
      setIsTyping(false);
      return;
    }
    else {
      // Fallback response for unrelated questions
      setMessages(prevMessages => [...prevMessages, {
        id: uuidv4(),
        sender: 'bot',
        text: "I'm sorry, but I can only provide information about our barbershop services, barbers, locations, hours, and promotions. Is there anything specific about EliteCuts that I can help you with?",
        timestamp: new Date()
      }]);
      setConversationContext(null);
    }
    
    setIsTyping(false);
  }, [
    formatServicesResponse, 
    formatBarbersResponse, 
    formatLocationResponse, 
    formatHoursResponse, 
    formatPromotionsResponse, 
    formatFAQResponse, 
    findServiceInfo, 
    formatBarberDetails,
    getTodaysHours,
    navigateToBooking,
    conversationContext,
    barbers
  ]);

  // Handle sending a message
  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = {
      id: uuidv4(),
      sender: 'user' as const,
      text: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Simulate bot thinking and respond after a short delay
    setTimeout(() => {
      processUserInput(userMessage.text);
    }, 1000);
  }, [input, processUserInput]);

  return {
    isOpen,
    setIsOpen,
    input,
    setInput,
    messages,
    setMessages,
    isTyping,
    handleSend,
    isLoading,
    navigateToBooking,
    dataInitialized
  };
}
