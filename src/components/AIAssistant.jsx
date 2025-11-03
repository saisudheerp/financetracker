import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  MessageSquare,
  Send,
  X,
  Bot,
  Check,
  AlertCircle,
  Loader,
} from "lucide-react";
import {
  parseTransactionFromText,
  processVoiceInput,
  chatWithAssistant,
  parseMultipleTransactions,
  queryFinancialData,
} from "../utils/geminiService";

const AIAssistant = ({
  isOpen,
  onClose,
  onTransactionParsed,
  categories,
  financialData = {},
}) => {
  const [mode, setMode] = useState("chat"); // 'chat', 'voice', or 'query'
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Load chat messages from localStorage or use default
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem("sai_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
    return [
      {
        role: "assistant",
        content:
          "Hey! I'm Sai 😎 I turn your random spending confessions into organized transactions. Add one or multiple at once! Try: 'Spent 500 on pizza, 200 on uber and got 50000 salary'",
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState(null);
  const [parsedTransactions, setParsedTransactions] = useState([]); // For multiple transactions
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const originalTransactionCountRef = useRef(0); // Track original count before removals

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("sai_chat_history", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Handle closing - clear chat history
  const handleClose = () => {
    // Clear localStorage
    localStorage.removeItem("sai_chat_history");

    // Reset chat to initial message
    setChatMessages([
      {
        role: "assistant",
        content:
          "Hey! I'm Sai 😎 I turn your random spending confessions into organized transactions. Add one or multiple at once! Try: 'Spent 500 on pizza, 200 on uber and got 50000 salary'",
      },
    ]);

    // Reset other states
    setParsedTransaction(null);
    setParsedTransactions([]);
    originalTransactionCountRef.current = 0;
    setTranscript("");
    setInputMessage("");
    setError(null);

    // Close the modal
    onClose();
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-IN";

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        // Only stop if it's an actual error, not 'no-speech' or 'aborted'
        if (event.error !== "no-speech" && event.error !== "aborted") {
          setIsListening(false);
          setError("Voice recognition error. Please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        // Restart recognition if user hasn't manually stopped it
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore errors from trying to restart
            console.log("Recognition restart attempt:", e);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);

      if (transcript.trim()) {
        await processTranscript(transcript);
      }
    }
  };

  const processTranscript = async (text) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processVoiceInput(text, categories);

      if (result.confidence > 0.5) {
        setParsedTransaction(result);

        // Generate witty sarcastic response based on DESCRIPTION first, then category
        let response = "";
        const amount = result.amount;
        const desc = (result.description || "").toLowerCase();
        const category = result.categoryName.toLowerCase();

        // Description-based sarcasm (priority)
        if (
          desc.includes("zomato") ||
          desc.includes("swiggy") ||
          desc.includes("ubereats")
        ) {
          const deliveryQuips = [
            `₹${amount} on ${result.description}? Too lazy to cook again? 🍜 Confirm?`,
            `Another ₹${amount} for food delivery... Your doorbell is getting a workout! 🚪 Right?`,
            `₹${amount} on ${result.description}... Delivery charges adding up, huh? 📦 Good?`,
          ];
          response =
            deliveryQuips[Math.floor(Math.random() * deliveryQuips.length)];
        } else if (
          desc.includes("pizza") ||
          desc.includes("burger") ||
          desc.includes("biryani")
        ) {
          const junkQuips = [
            `₹${amount} on ${result.description}? Living your best life! 🍕 Confirm?`,
            `${result.description} for ₹${amount}... Your diet starts tomorrow, right? 😋 Right?`,
            `₹${amount} worth of ${result.description}... Worth every calorie! 🍔 Good?`,
          ];
          response = junkQuips[Math.floor(Math.random() * junkQuips.length)];
        } else if (
          desc.includes("netflix") ||
          desc.includes("prime") ||
          desc.includes("spotify") ||
          desc.includes("subscription")
        ) {
          const subQuips = [
            `₹${amount} for ${result.description}? Another subscription you'll forget about! 📺 Confirm?`,
            `${result.description} - ₹${amount}... Gotta feed those algorithms! 🎵 Right?`,
            `₹${amount} on ${result.description}... Entertainment isn't cheap anymore! 🎬 Good?`,
          ];
          response = subQuips[Math.floor(Math.random() * subQuips.length)];
        } else if (
          desc.includes("uber") ||
          desc.includes("ola") ||
          desc.includes("rapido") ||
          desc.includes("cab")
        ) {
          const rideQuips = [
            `₹${amount} on ${result.description}? Too fancy to take the bus? 🚖 Confirm?`,
            `Another ₹${amount} ride... Gas money or convenience? 🛣️ Right?`,
            `₹${amount} for ${result.description}... Where we going this time? 🚗 Good?`,
          ];
          response = rideQuips[Math.floor(Math.random() * rideQuips.length)];
        } else if (
          desc.includes("coffee") ||
          desc.includes("starbucks") ||
          desc.includes("cafe")
        ) {
          const coffeeQuips = [
            `₹${amount} on ${result.description}? That's some expensive caffeine! ☕ Confirm?`,
            `Another ₹${amount} for coffee... Is this your fuel or your addiction? 😅 Right?`,
            `₹${amount} at ${result.description}... Someone needs their fix! ☕ Good?`,
          ];
          response =
            coffeeQuips[Math.floor(Math.random() * coffeeQuips.length)];
        } else if (
          desc.includes("amazon") ||
          desc.includes("flipkart") ||
          desc.includes("shopping")
        ) {
          const onlineQuips = [
            `₹${amount} on ${result.description}? Retail therapy strikes again! 🛒 Confirm?`,
            `${result.description} order for ₹${amount}... What did you "need" this time? 📦 Right?`,
            `₹${amount} shopping spree... Your cart betrayed you! 🛍️ Good?`,
          ];
          response =
            onlineQuips[Math.floor(Math.random() * onlineQuips.length)];
        } else if (
          desc.includes("gym") ||
          desc.includes("workout") ||
          desc.includes("fitness")
        ) {
          const gymQuips = [
            `₹${amount} for ${result.description}? New year, new you? 💪 Confirm?`,
            `Gym membership - ₹${amount}... Will you actually go though? 🏋️ Right?`,
            `₹${amount} on fitness... Your guilt is showing! 😂 Good?`,
          ];
          response = gymQuips[Math.floor(Math.random() * gymQuips.length)];
        } else if (
          desc.includes("movie") ||
          desc.includes("pvr") ||
          desc.includes("inox") ||
          desc.includes("cinema")
        ) {
          const movieQuips = [
            `₹${amount} on ${result.description}? Hope the popcorn was worth it! 🍿 Confirm?`,
            `Movie time for ₹${amount}... Better than the last one? 🎬 Right?`,
            `₹${amount} at ${result.description}... Big screen, big expense! 🎥 Good?`,
          ];
          response = movieQuips[Math.floor(Math.random() * movieQuips.length)];
        }
        // Category-based fallback (if description didn't match anything)
        else if (category.includes("food") || category.includes("dining")) {
          const foodQuips = [
            `₹${amount} on food? Eating your feelings again? 🍕 Confirm?`,
            `Another ₹${amount} for food... Your taste buds are expensive! 😋 Right?`,
            `₹${amount} on ${result.categoryName}... Someone's hungry! 🍔 Good?`,
          ];
          response = foodQuips[Math.floor(Math.random() * foodQuips.length)];
        } else if (
          category.includes("shopping") ||
          category.includes("clothes")
        ) {
          const shopQuips = [
            `₹${amount} on shopping? Retail therapy strikes again! �️ Confirm?`,
            `Another ₹${amount} spent... Your closet called, it's full! 👗 Right?`,
            `₹${amount} for ${result.categoryName}... Treat yourself much? 💳 Good?`,
          ];
          response = shopQuips[Math.floor(Math.random() * shopQuips.length)];
        } else if (
          category.includes("transport") ||
          category.includes("travel")
        ) {
          const travelQuips = [
            `₹${amount} on travel? Going places, literally! � Confirm?`,
            `₹${amount} for ${result.categoryName}... Where to this time? 🛣️ Right?`,
            `Another ₹${amount} on transport... Gas ain't cheap! ⛽ Good?`,
          ];
          response =
            travelQuips[Math.floor(Math.random() * travelQuips.length)];
        } else if (
          category.includes("entertain") ||
          category.includes("movie")
        ) {
          const funQuips = [
            `₹${amount} on entertainment? Living your best life! 🎬 Confirm?`,
            `₹${amount} for fun... YOLO mode activated! 🎉 Right?`,
            `Another ₹${amount} on ${result.categoryName}... All work and no play? Nah! 🎮 Good?`,
          ];
          response = funQuips[Math.floor(Math.random() * funQuips.length)];
        } else if (result.type === "income") {
          const incomeQuips = [
            `Ooh ₹${amount} coming in! Don't spend it all at once 😏 Confirm?`,
            `₹${amount} earned? Finally some good news! 💰 Right?`,
            `Cha-ching! ₹${amount} in the bank... for now 🤑 Good?`,
          ];
          response =
            incomeQuips[Math.floor(Math.random() * incomeQuips.length)];
        } else {
          // Generic responses for other categories
          const genericQuips = [
            `₹${amount} on ${result.categoryName}... Interesting choice! 🤔 Confirm?`,
            `So ₹${amount} for ${result.categoryName}... Money well spent? 💸 Right?`,
            `₹${amount} here, ₹${amount} there... It adds up! 📊 Good?`,
          ];
          response =
            genericQuips[Math.floor(Math.random() * genericQuips.length)];
        }

        setChatMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: text,
          },
          {
            role: "assistant",
            content: response,
          },
        ]);
      } else {
        setError(
          "I'm not confident about this. Please try again with more details."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setIsProcessing(true);
    setError(null);

    try {
      // Check if it's a query about financial data
      const lowerMessage = userMessage.toLowerCase();
      const isQuery =
        lowerMessage.includes("what") ||
        lowerMessage.includes("how much") ||
        lowerMessage.includes("show me") ||
        lowerMessage.includes("tell me") ||
        lowerMessage.includes("total") ||
        lowerMessage.includes("last month") ||
        lowerMessage.includes("this month") ||
        lowerMessage.includes("income") ||
        lowerMessage.includes("expense") ||
        lowerMessage.includes("spent on") ||
        lowerMessage.includes("savings") ||
        lowerMessage.includes("budget");

      // If it's a query and we have financial data, use query mode
      if (
        isQuery &&
        financialData &&
        Object.keys(financialData).length > 0 &&
        !lowerMessage.includes("spent ") && // Not "I spent"
        !lowerMessage.includes("paid ") // Not "I paid"
      ) {
        const response = await queryFinancialData(userMessage, financialData);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ]);
        return;
      }

      // Check if categories are loaded
      if (!categories || categories.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Oops! Categories aren't loaded yet. Try refreshing the page or wait a moment! 🔄",
          },
        ]);
        return;
      }

      console.log(
        "📂 Available categories:",
        categories.map((c) => `${c.name} (${c.type})`).join(", ")
      );

      // Check if it's a transaction entry (reuse lowerMessage from above)
      if (
        lowerMessage.includes("spent") ||
        lowerMessage.includes("paid") ||
        lowerMessage.includes("received") ||
        lowerMessage.includes("income") ||
        /\d+/.test(userMessage) // Contains numbers
      ) {
        // Try to parse multiple transactions first
        const results = await parseMultipleTransactions(
          userMessage,
          categories
        );

        // Check if multiple transactions were found
        if (results.length > 1) {
          // Multiple transactions detected
          setParsedTransactions(results);
          originalTransactionCountRef.current = results.length; // Store original count

          const totalAmount = results.reduce((sum, t) => sum + t.amount, 0);
          const count = results.length;

          const multiQuips = [
            `Whoa! ${count} transactions at once? Efficient! 💪 Total: ₹${totalAmount}. Confirm all?`,
            `${count} transactions? Someone's been busy! 🤑 That's ₹${totalAmount} total. Add them all?`,
            `Look at you go! ${count} transactions worth ₹${totalAmount}. Ready to save all?`,
            `${count} in one go? I like your style! 😎 Total: ₹${totalAmount}. Shall we?`,
          ];

          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                multiQuips[Math.floor(Math.random() * multiQuips.length)],
            },
          ]);

          return; // Exit early for multiple transactions
        }

        // Single transaction - use existing logic
        const result = results[0];

        if (result.confidence > 0.5) {
          setParsedTransaction(result);

          // Generate witty sarcastic response based on DESCRIPTION first, then category
          let response = "";
          const amount = result.amount;
          const desc = (result.description || "").toLowerCase();
          const category = result.categoryName.toLowerCase();

          // Description-based sarcasm (priority)
          if (
            desc.includes("zomato") ||
            desc.includes("swiggy") ||
            desc.includes("ubereats")
          ) {
            const deliveryQuips = [
              `₹${amount} on ${result.description}? Too lazy to cook again? 🍜 Confirm?`,
              `Another ₹${amount} for food delivery... Your doorbell is getting a workout! 🚪 Right?`,
              `₹${amount} on ${result.description}... Delivery charges adding up, huh? 📦 Good?`,
            ];
            response =
              deliveryQuips[Math.floor(Math.random() * deliveryQuips.length)];
          } else if (
            desc.includes("pizza") ||
            desc.includes("burger") ||
            desc.includes("biryani")
          ) {
            const junkQuips = [
              `₹${amount} on ${result.description}? Living your best life! 🍕 Confirm?`,
              `${result.description} for ₹${amount}... Your diet starts tomorrow, right? 😋 Right?`,
              `₹${amount} worth of ${result.description}... Worth every calorie! 🍔 Good?`,
            ];
            response = junkQuips[Math.floor(Math.random() * junkQuips.length)];
          } else if (
            desc.includes("netflix") ||
            desc.includes("prime") ||
            desc.includes("spotify") ||
            desc.includes("subscription")
          ) {
            const subQuips = [
              `₹${amount} for ${result.description}? Another subscription you'll forget about! 📺 Confirm?`,
              `${result.description} - ₹${amount}... Gotta feed those algorithms! 🎵 Right?`,
              `₹${amount} on ${result.description}... Entertainment isn't cheap anymore! 🎬 Good?`,
            ];
            response = subQuips[Math.floor(Math.random() * subQuips.length)];
          } else if (
            desc.includes("uber") ||
            desc.includes("ola") ||
            desc.includes("rapido") ||
            desc.includes("cab")
          ) {
            const rideQuips = [
              `₹${amount} on ${result.description}? Too fancy to take the bus? 🚖 Confirm?`,
              `Another ₹${amount} ride... Gas money or convenience? 🛣️ Right?`,
              `₹${amount} for ${result.description}... Where we going this time? 🚗 Good?`,
            ];
            response = rideQuips[Math.floor(Math.random() * rideQuips.length)];
          } else if (
            desc.includes("coffee") ||
            desc.includes("starbucks") ||
            desc.includes("cafe")
          ) {
            const coffeeQuips = [
              `₹${amount} on ${result.description}? That's some expensive caffeine! ☕ Confirm?`,
              `Another ₹${amount} for coffee... Is this your fuel or your addiction? 😅 Right?`,
              `₹${amount} at ${result.description}... Someone needs their fix! ☕ Good?`,
            ];
            response =
              coffeeQuips[Math.floor(Math.random() * coffeeQuips.length)];
          } else if (
            desc.includes("amazon") ||
            desc.includes("flipkart") ||
            desc.includes("shopping")
          ) {
            const onlineQuips = [
              `₹${amount} on ${result.description}? Retail therapy strikes again! 🛒 Confirm?`,
              `${result.description} order for ₹${amount}... What did you "need" this time? 📦 Right?`,
              `₹${amount} shopping spree... Your cart betrayed you! 🛍️ Good?`,
            ];
            response =
              onlineQuips[Math.floor(Math.random() * onlineQuips.length)];
          } else if (
            desc.includes("gym") ||
            desc.includes("workout") ||
            desc.includes("fitness")
          ) {
            const gymQuips = [
              `₹${amount} for ${result.description}? New year, new you? 💪 Confirm?`,
              `Gym membership - ₹${amount}... Will you actually go though? 🏋️ Right?`,
              `₹${amount} on fitness... Your guilt is showing! 😂 Good?`,
            ];
            response = gymQuips[Math.floor(Math.random() * gymQuips.length)];
          } else if (
            desc.includes("movie") ||
            desc.includes("pvr") ||
            desc.includes("inox") ||
            desc.includes("cinema")
          ) {
            const movieQuips = [
              `₹${amount} on ${result.description}? Hope the popcorn was worth it! 🍿 Confirm?`,
              `Movie time for ₹${amount}... Better than the last one? 🎬 Right?`,
              `₹${amount} at ${result.description}... Big screen, big expense! 🎥 Good?`,
            ];
            response =
              movieQuips[Math.floor(Math.random() * movieQuips.length)];
          }
          // Category-based fallback (if description didn't match anything)
          else if (category.includes("food") || category.includes("dining")) {
            const foodQuips = [
              `₹${amount} on food? Eating your feelings again? 🍕 Confirm?`,
              `Another ₹${amount} for food... Your taste buds are expensive! 😋 Right?`,
              `₹${amount} on ${result.categoryName}... Someone's hungry! 🍔 Good?`,
            ];
            response = foodQuips[Math.floor(Math.random() * foodQuips.length)];
          } else if (
            category.includes("shopping") ||
            category.includes("clothes")
          ) {
            const shopQuips = [
              `₹${amount} on shopping? Retail therapy strikes again! �️ Confirm?`,
              `Another ₹${amount} spent... Your closet called, it's full! 👗 Right?`,
              `₹${amount} for ${result.categoryName}... Treat yourself much? 💳 Good?`,
            ];
            response = shopQuips[Math.floor(Math.random() * shopQuips.length)];
          } else if (
            category.includes("transport") ||
            category.includes("travel")
          ) {
            const travelQuips = [
              `₹${amount} on travel? Going places, literally! � Confirm?`,
              `₹${amount} for ${result.categoryName}... Where to this time? 🛣️ Right?`,
              `Another ₹${amount} on transport... Gas ain't cheap! ⛽ Good?`,
            ];
            response =
              travelQuips[Math.floor(Math.random() * travelQuips.length)];
          } else if (
            category.includes("entertain") ||
            category.includes("movie")
          ) {
            const funQuips = [
              `₹${amount} on entertainment? Living your best life! 🎬 Confirm?`,
              `₹${amount} for fun... YOLO mode activated! 🎉 Right?`,
              `Another ₹${amount} on ${result.categoryName}... All work and no play? Nah! 🎮 Good?`,
            ];
            response = funQuips[Math.floor(Math.random() * funQuips.length)];
          } else if (result.type === "income") {
            const incomeQuips = [
              `Ooh ₹${amount} coming in! Don't spend it all at once 😏 Confirm?`,
              `₹${amount} earned? Finally some good news! 💰 Right?`,
              `Cha-ching! ₹${amount} in the bank... for now 🤑 Good?`,
            ];
            response =
              incomeQuips[Math.floor(Math.random() * incomeQuips.length)];
          } else {
            // Generic responses for other categories
            const genericQuips = [
              `₹${amount} on ${result.categoryName}... Interesting choice! 🤔 Confirm?`,
              `So ₹${amount} for ${result.categoryName}... Money well spent? 💸 Right?`,
              `₹${amount} here, ₹${amount} there... It adds up! 📊 Good?`,
            ];
            response =
              genericQuips[Math.floor(Math.random() * genericQuips.length)];
          }

          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: response,
            },
          ]);
        } else {
          const response = await chatWithAssistant(userMessage, chatMessages);
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: response },
          ]);
        }
      } else {
        // General chat
        const response = await chatWithAssistant(userMessage, chatMessages);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ]);
      }
    } catch (err) {
      setError(err.message);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTransaction = () => {
    if (parsedTransaction) {
      onTransactionParsed(parsedTransaction);
      setParsedTransaction(null);
      setTranscript("");

      // Sarcastic success messages
      const successMessages = [
        "Done! Your wallet will remember this 💸",
        "Added! That's another one for the history books 📚",
        "Boom! Transaction locked in 🔒",
        "Saved! Now try not to spend more 😏",
        "Got it! Your bank account feels that one 💳",
      ];
      const randomSuccess =
        successMessages[Math.floor(Math.random() * successMessages.length)];

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: randomSuccess,
        },
      ]);
    }
  };

  const confirmMultipleTransactions = async () => {
    if (parsedTransactions.length > 0) {
      const count = parsedTransactions.length;
      const originalCount = originalTransactionCountRef.current;
      const totalAmount = parsedTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      // Store transactions before clearing
      const transactionsToAdd = [...parsedTransactions];

      // Success messages based on whether some were removed
      let multiSuccessMessages;

      if (count === originalCount) {
        // All transactions added
        multiSuccessMessages = [
          `Done! All ${count} transactions (₹${totalAmount}) added! Your wallet just had a moment 💸`,
          `Boom! ${count} transactions locked in. That's ₹${totalAmount} total! 📚`,
          `Added all ${count}! ₹${totalAmount} spending spree now documented 😏`,
          `${count} transactions saved! That's ₹${totalAmount}... hope your bank survives 💳`,
          `All ${count} done! ₹${totalAmount} in one go. Efficiency! 🚀`,
        ];
      } else {
        // Some were removed
        multiSuccessMessages = [
          `Done! ${count} transactions saved out of ${originalCount}. That's ₹${totalAmount} total! 💸`,
          `Boom! Added ${count} out of ${originalCount} transactions (₹${totalAmount}). Nice filtering! 📚`,
          `${count} of ${originalCount} saved! ₹${totalAmount} spending documented 😏`,
          `Got ${count} out of ${originalCount}! That's ₹${totalAmount} added to your history 💳`,
          `${count}/${originalCount} transactions done! ₹${totalAmount} locked in 🚀`,
        ];
      }

      const randomSuccess =
        multiSuccessMessages[
          Math.floor(Math.random() * multiSuccessMessages.length)
        ];

      // Add success message FIRST
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: randomSuccess,
        },
      ]);

      // Clear UI state
      setParsedTransactions([]);
      setTranscript("");
      originalTransactionCountRef.current = 0;

      // Pass all transactions as an array to be batch inserted
      await onTransactionParsed(transactionsToAdd);
    }
  };

  const removeTransaction = (indexToRemove) => {
    const updatedTransactions = parsedTransactions.filter(
      (_, index) => index !== indexToRemove
    );

    if (updatedTransactions.length === 0) {
      // If all transactions removed, clear everything
      setParsedTransactions([]);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "All transactions removed. Tell me what you actually spent 🤷",
        },
      ]);
    } else {
      setParsedTransactions(updatedTransactions);
      const removeQuips = [
        `Removed! ${updatedTransactions.length} left to add 👍`,
        `Gone! Still got ${updatedTransactions.length} to go ✨`,
        `Deleted! ${updatedTransactions.length} transactions remaining �️`,
      ];
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: removeQuips[Math.floor(Math.random() * removeQuips.length)],
        },
      ]);
    }
  };

  const rejectTransaction = () => {
    setParsedTransaction(null);
    setParsedTransactions([]);
    setTranscript("");
    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "No worries! Tell me what you actually spent 🤷",
      },
    ]);
  };

  // Don't unmount - just hide with CSS to preserve state
  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn ${
        !isOpen ? "hidden" : ""
      }`}
    >
      <div className="bg-gradient-to-br from-white to-teal-50 dark:from-gray-900 dark:to-teal-950 rounded-3xl shadow-2xl max-w-2xl w-full h-[85vh] flex flex-col border border-teal-200 dark:border-teal-800 animate-slideUp">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 dark:from-teal-700 dark:via-cyan-700 dark:to-teal-700 p-6 relative overflow-hidden rounded-t-3xl">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/30 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-2xl font-playfair tracking-wide">
                  Sai
                </h2>
                <p className="text-white/90 text-sm font-poppins">
                  Smart AI for effortless transactions
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all duration-300 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mode Toggle - Fixed */}
        <div className="flex-shrink-0 flex gap-3 p-5 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-900/50 dark:to-teal-900/30 border-b border-teal-100 dark:border-teal-800">
          <button
            onClick={() => setMode("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              mode === "chat"
                ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/50"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-700 border border-teal-200 dark:border-gray-700"
            }`}
          >
            <MessageSquare className={`w-5 h-5 `} />
            <span className="font-poppins">Chat Mode</span>
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              mode === "voice"
                ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/50"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-700 border border-teal-200 dark:border-gray-700"
            }`}
          >
            <Mic
              className={`w-5 h-5 ${mode === "voice" ? "animate-pulse" : ""}`}
            />
            <span className="font-poppins">Voice Mode</span>
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-teal-50/30 dark:to-teal-950/30 min-h-0">
          {mode === "chat" ? (
            // Chat Mode
            <div className="space-y-4 pb-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-4 px-4 py-12">
                  <div className="bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 p-4 rounded-2xl">
                    <Bot className="w-12 h-12 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 font-playfair text-center">
                    Hi! I'm Sai 👋
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md font-poppins">
                    Your smart assistant for managing transactions. Ask me
                    anything about your finances or just say things like:
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2 border border-gray-200 dark:border-gray-700 max-w-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-poppins">
                      💰 "I spent 500 on groceries"
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-poppins">
                      📊 "How much did I spend this month?"
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-poppins">
                      💡 "Give me budgeting tips"
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      } animate-slideIn`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-teal-600 text-white rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-2 text-teal-600 dark:text-teal-400">
                            <Bot className="w-4 h-4" />
                            <span className="text-xs font-semibold">Sai</span>
                          </div>
                        )}
                        <p className="text-sm font-poppins leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl rounded-bl-sm">
                        <div className="flex items-center gap-2">
                          <Loader className="w-5 h-5 animate-spin text-teal-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-poppins">
                            Processing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          ) : (
            // Voice Mode - Refined
            <div className="flex flex-col items-center justify-center h-full space-y-6 sm:space-y-8 py-6 sm:py-8 px-4">
              {/* Voice Visualizer Container */}
              <div className="relative flex items-center justify-center w-full max-w-sm">
                {/* Animated wave rings */}
                {isListening && (
                  <>
                    <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-gray-300 dark:border-gray-600 animate-wave-1"></div>
                    <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-gray-200 dark:border-gray-700 animate-wave-2"></div>
                    <div className="absolute w-44 h-44 sm:w-60 sm:h-60 rounded-full border border-gray-100 dark:border-gray-800 animate-wave-3"></div>
                  </>
                )}

                {/* Main microphone button */}
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`relative z-10 w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                    isListening
                      ? "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl shadow-teal-500/40 scale-105"
                      : "bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 hover:scale-105 hover:shadow-xl hover:shadow-teal-500/40"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {/* Icon */}
                  {isListening ? (
                    <MicOff className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                  )}
                </button>
              </div>

              {/* Status Text */}
              <div className="text-center space-y-2 max-w-lg px-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 font-playfair">
                  {isListening ? "Listening..." : "Ready to Listen"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-poppins">
                  {isListening
                    ? "Speak naturally about your transaction"
                    : "Tap the microphone to start recording"}
                </p>
                {!isListening && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-poppins italic">
                    e.g., "I spent 500 on groceries"
                  </p>
                )}
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl w-full max-w-xl border border-gray-200 dark:border-gray-700 shadow-md animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Transcript:
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-poppins break-words">
                        {transcript}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                  <Loader className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-poppins">
                    Processing...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 shadow-lg animate-shake">
              <div className="bg-red-500 p-2 rounded-full">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
                  Oops!
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-poppins">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Parsed Transaction Confirmation */}
          {parsedTransaction && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-400 dark:border-green-700 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-xl animate-slideUp mx-3 sm:mx-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-green-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                  <Check className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-base sm:text-lg text-green-700 dark:text-green-400 font-playfair block truncate">
                    Transaction Ready!
                  </span>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Please review and confirm
                  </p>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      Type
                    </span>
                    <p className="text-sm sm:text-lg font-bold capitalize mt-1 text-gray-800 dark:text-gray-200 truncate">
                      {parsedTransaction.type === "income" ? "💰" : "💸"}{" "}
                      {parsedTransaction.type}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      Amount
                    </span>
                    <p className="text-sm sm:text-lg font-bold mt-1 text-teal-600 dark:text-teal-400 truncate">
                      ₹{parsedTransaction.amount}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      Category
                    </span>
                    <p className="text-xs sm:text-sm font-bold mt-1 text-gray-800 dark:text-gray-200 truncate">
                      {parsedTransaction.categoryName}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      Payment
                    </span>
                    <p className="text-xs sm:text-sm font-bold capitalize mt-1 text-gray-800 dark:text-gray-200 truncate">
                      {parsedTransaction.payment_method?.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    Description
                  </span>
                  <p className="text-xs sm:text-sm font-semibold mt-1 text-gray-800 dark:text-gray-200 break-words">
                    {parsedTransaction.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={confirmTransaction}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/50 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  Confirm
                </button>
                <button
                  onClick={rejectTransaction}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 hover:from-gray-500 hover:to-gray-600 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Multiple Parsed Transactions Confirmation */}
          {parsedTransactions.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-400 dark:border-purple-700 rounded-2xl p-5 space-y-4 shadow-xl animate-slideUp">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-full">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg text-purple-700 dark:text-purple-400 font-playfair">
                    {parsedTransactions.length} Transactions Ready!
                  </span>
                  <p className="text-xs text-purple-600 dark:text-purple-500">
                    Review all before confirming
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {parsedTransactions.map((transaction, index) => (
                  <div
                    key={index}
                    className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-4 space-y-2 border-2 border-purple-200 dark:border-purple-800 relative"
                  >
                    {/* Remove button */}
                    <button
                      onClick={() => removeTransaction(index)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-all duration-200 transform hover:scale-110 shadow-lg"
                      title="Remove this transaction"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-between mb-2 pr-8">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Transaction #{index + 1}
                      </span>
                      <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        ₹{transaction.amount}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Type:
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {transaction.type === "income" ? "💰" : "💸"}{" "}
                          {transaction.type}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Category:
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {transaction.categoryName}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Description:
                      </span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {transaction.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    ₹{parsedTransactions.reduce((sum, t) => sum + t.amount, 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmMultipleTransactions}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/50 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Add All {parsedTransactions.length}
                </button>
                <button
                  onClick={rejectTransaction}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 hover:from-gray-500 hover:to-gray-600 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input (only in chat mode) - Fixed */}
        {mode === "chat" && (
          <div className="flex-shrink-0 p-3 sm:p-5 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-900/50 dark:to-teal-900/30 border-t border-teal-100 dark:border-teal-800 rounded-b-3xl">
            <div className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message or transaction..."
                className="flex-1 min-w-0 px-3 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-teal-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-600 focus:border-transparent font-poppins placeholder:text-gray-400 text-sm sm:text-base shadow-inner transition-all duration-300"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 sm:p-4 rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/50 transform hover:scale-105 active:scale-95"
              >
                {isProcessing ? (
                  <Loader className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center font-poppins hidden sm:block">
              💡 Tip: Try "Spent 200 on groceries" or "Received 5000 as salary"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
