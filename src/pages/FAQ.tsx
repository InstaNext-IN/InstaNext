import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Shield, CreditCard, RotateCw, MessagesSquare, Send, X, Loader2 } from 'lucide-react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const faqs = [
  {
    category: "General",
    icon: <HelpCircle className="w-5 h-5 text-gold-600" />,
    items: [
      {
        question: "What is Insta Next?",
        answer: "Insta Next is a modern classifieds platform where users can buy and sell new or used items locally. We provide a safe, user-friendly environment to connect buyers and sellers."
      },
      {
        question: "Is it free to use?",
        answer: "Yes! Browsing, chatting, and posting basic ads on Insta Next is completely free of charge."
      }
    ]
  },
  {
    category: "Buying & Selling",
    icon: <CreditCard className="w-5 h-5 text-gold-600" />,
    items: [
      {
        question: "How do I buy an item?",
        answer: "Simply browse the categories or use the search bar to find what you're looking for. Once you find an item you like, click 'Chat with Seller' to negotiate the price and arrange a meetup."
      },
      {
        question: "How do I post an ad to sell?",
        answer: "Click the 'Sell' (+ icon) button at the top right of the screen. Fill in the details about your item, upload some clear photos, set a price, and publish! Your ad will be live instantly."
      },
      {
        question: "How long does my ad stay active?",
        answer: "Ads remain active for 30 days. If your item hasn't sold after 30 days, it will be marked as 'Expired'. You can easily 'Repost' it from your profile or the listing page to make it live for another 30 days."
      }
    ]
  },
  {
    category: "Communication",
    icon: <MessagesSquare className="w-5 h-5 text-gold-600" />,
    items: [
      {
        question: "How do I communicate with buyers/sellers?",
        answer: "We have a built-in secure chat system. You can message users directly through the platform without sharing your personal phone number or email."
      },
      {
        question: "Where can I see my messages?",
        answer: "You can view all your conversations by clicking on your profile icon and navigating to the 'My Chats' tab."
      }
    ]
  },
  {
    category: "Safety & Security",
    icon: <Shield className="w-5 h-5 text-gold-600" />,
    items: [
      {
        question: "Is my personal information safe?",
        answer: "Absolutely. We prioritize your privacy. Your contact details are not shared publicly unless you explicitly provide them in your ad description. All communication happens securely within our platform."
      },
      {
        question: "What should I do if I spot a scam or suspicious activity?",
        answer: "If you encounter any suspicious listings or users, please hit the 'Report' button on the listing page. Our team will review and take appropriate action immediately."
      }
    ]
  }
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const { user, setShowLoginModal } = useAuth();
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSupportClick = () => {
    if (!user) {
      toast.error('Please login to contact support');
      setShowLoginModal(true);
      return;
    }
    setShowSupportForm(true);
  };

  const submitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!supportMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        userEmail: user.email,
        message: supportMessage,
        status: "open",
        createdAt: serverTimestamp(),
      });
      toast.success("Message sent to support! We will get back to you soon.");
      setSupportMessage('');
      setShowSupportForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "support_tickets");
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 pt-24 sm:pt-32 min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-stone-900 mb-4 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-stone-500 text-lg">
          Everything you need to know about buying and selling on Insta Next.
        </p>
      </div>

      <div className="space-y-12">
        {faqs.map((category, cIdx) => (
          <div key={cIdx} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gold-50 rounded-xl">
                {category.icon}
              </div>
              <h2 className="text-xl font-bold text-stone-900">
                {category.category}
              </h2>
            </div>
            
            <div className="space-y-4">
              {category.items.map((item, iIdx) => {
                const isOpen = openItems[`${cIdx}-${iIdx}`];
                return (
                  <div 
                    key={iIdx}
                    className="border border-stone-100 rounded-2xl overflow-hidden transition-colors hover:border-gold-200"
                  >
                    <button
                      onClick={() => toggleItem(cIdx, iIdx)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between focus:outline-none"
                    >
                      <span className="font-semibold text-stone-800 pr-4">{item.question}</span>
                      <ChevronDown 
                        className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: "easeInOut" }}
                         >
                           <div className="px-6 pb-4 pt-2 text-stone-600 leading-relaxed">
                             {item.answer}
                           </div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 bg-teal-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!showSupportForm ? (
            <motion.div 
              key="support-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
              <p className="text-teal-100 mb-8 max-w-lg mx-auto">
                Can't find the answer you're looking for? Please contact our friendly team.
              </p>
              <button 
                onClick={handleSupportClick}
                className="bg-gold-500 text-teal-900 font-bold px-8 py-3 rounded-xl hover:bg-gold-600 transition-colors shadow-lg inline-flex items-center space-x-2"
              >
                <MessagesSquare className="w-5 h-5" />
                <span>Contact Support</span>
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="support-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 text-stone-900 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSupportForm(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                <Shield className="w-6 h-6 text-gold-500" />
                <span>Submit a Request</span>
              </h3>
              
              <form onSubmit={submitSupportTicket} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">From Address</label>
                  <input 
                    type="email" 
                    disabled 
                    value={user?.email || ''} 
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 font-medium focus:outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-stone-500 mt-2">
                    We will reply to this email address. Your issue will be sent securely to our support team.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">How can we help?</label>
                  <textarea 
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue, query, or suggestion in detail..."
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || !supportMessage.trim()}
                  className="w-full bg-teal-900 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-teal-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>{isSubmitting ? 'Sending Request...' : 'Send Message'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
