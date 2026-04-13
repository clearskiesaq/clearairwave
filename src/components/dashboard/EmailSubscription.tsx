import React, { useState } from 'react';
import { db } from "@/components/firebase"; // adjust path if needed
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { query, where, getDocs } from "firebase/firestore";



const EmailSubscription = () => {
  const [title, setTitle] = useState('');

  //Checks if email is in proper format
  const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

  //Chat created button click function to send welcome email to user through pipedream
  const handleSubmit = async () => {
    if (!title || !isValidEmail(title)) {
      alert("Please enter an email address");
      return;
    }
  
    try {
  // Save email to Firestore

  //Logic to Prevent Duplicates
  const emailQuery = query(
  collection(db, "emails"),
  where("email", "==", title)
  );
  const querySnapshot = await getDocs(emailQuery);
  if (!querySnapshot.empty) {
  alert("You're already subscribed!");
  return;
  }

  await addDoc(collection(db, "emails"), {
    email: title,
    timestamp: serverTimestamp(),
  });

  // Send to Pipedream (existing code)
  const response = await fetch(import.meta.env.VITE_PIPEDREAM_WELCOME, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: title }),
  });

  if (response.ok) {
    alert("Subscription successful! Check your inbox for a welcome email.");
    setTitle("");
  } else {
    alert("Failed to subscribe. Please try again.");
  }
} catch (error) {
  console.error("Error subscribing:", error);
  alert("An error occurred. Please try again later.");
}
  };

  return (
    <div className="glass-card py-10 px-6 rounded-xl">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Stay Updated</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Subscribe to receive real-time air quality alerts and updates.
        </p>

        <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={handleSubmit}
           className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg shadow-sm hover:opacity-90 transition">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSubscription;