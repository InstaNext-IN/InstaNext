import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Shield, CreditCard, RotateCw, MessagesSquare } from 'lucide-react';

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

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
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
      
      <div className="mt-16 text-center bg-teal-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
        <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
        <p className="text-teal-100 mb-8 max-w-lg mx-auto">
          Can't find the answer you're looking for? Please contact our friendly team.
        </p>
        <button 
          onClick={() => window.location.href = "mailto:support@instanext.in"}
          className="bg-gold-500 text-teal-900 font-bold px-8 py-3 rounded-xl hover:bg-gold-600 transition-colors shadow-lg"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}
