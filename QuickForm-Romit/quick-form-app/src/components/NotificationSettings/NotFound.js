import React from "react";

const NotFoundNotifications = () => {
  const randomEmojis = ["😴", "🤷‍♂️", "🔍", "👀", "🙈", "🦗", "📭"];
  const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

  const funnyMessages = [
    "No notifications here... just like my social life.",
    "It's so empty, you can hear an echo!",
    "Nothing to see here, but you're still awesome!",
    "Zero notifications. 100% peace of mind.",
    "The sound of silence... and no notifications.",
    "All caught up! Now go enjoy some sunshine!",
    "No news is good news, right?",
  ];
  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg max-w-md mx-auto">
      {/* Animated empty state illustration */}
      <div className="relative mb-6">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
          <div className="text-5xl animate-bounce">{randomEmoji}</div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-yellow-200 rounded-full w-10 h-10 flex items-center justify-center text-xl">
          🎉
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">No New Notifications</h2>
      <p className="text-gray-600 mb-6">{randomMessage}</p>

      {/* Fun progress bar showing how empty it is */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-purple-500 h-2.5 rounded-full animate-pulse" 
          style={{ width: "0.5%" }}
          title="Your notification emptiness level"
        ></div>
      </div>

      {/* Funny action button */}
      <button 
        className="px-6 py-3 bg-gradient-to-r from-purple-400 to-blue-500 text-white font-medium rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center"
        onClick={() => alert("Sorry, still nothing! Maybe try refreshing?")}
      >
        <span className="mr-2">🔔</span>
        Create Notification
      </button>

      {/* Micro-interaction */}
      <p className="mt-4 text-xs text-gray-400 animate-pulse">
        *notification sounds* 🦗
      </p>
    </div>
  );
};

export default NotFoundNotifications;