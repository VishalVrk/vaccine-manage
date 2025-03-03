import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="font-sans">
    <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-500">
            VaccineApp
          </div>
          <nav className="space-x-6">
            <a href="/features" className="text-gray-700 hover:text-blue-500 transition-colors">
              Features
            </a>
            <a href="/testimonials" className="text-gray-700 hover:text-blue-500 transition-colors">
              Testimonials
            </a>
            <a href="/about" className="text-gray-700 hover:text-blue-500 transition-colors">
              About
            </a>
          </nav>
          <Link
            to="/login"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Login / Sign Up
          </Link>
        </div>
      </header>
      {/* Hero Section */}
      <section className="bg-blue-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Welcome to Vaccine Appointment Management
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Easily manage vaccine appointments, track availability, and ensure a smooth vaccination process.
          </p>
          <div className="space-x-4">
            <a
              href="/login"
              className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors"
            >
              Get Started
            </a>
            <a
              href="/about"
              className="bg-transparent border border-blue-500 text-blue-500 px-6 py-3 rounded-md hover:bg-blue-500 hover:text-white transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                alt="Appointment Scheduling"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Easy Appointment Scheduling
              </h3>
              <p className="text-gray-600">
                Book and manage vaccine appointments effortlessly with our intuitive platform.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                alt="Vaccine Tracking"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Real-Time Vaccine Tracking
              </h3>
              <p className="text-gray-600">
                Stay updated on vaccine availability and track your appointments in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1615461065929-4f8ffed6ca40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                alt="Secure Management"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Secure and Reliable
              </h3>
              <p className="text-gray-600">
                Your data is safe with us. We use advanced security measures to protect your information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                "This platform made scheduling my vaccine appointment so easy. Highly recommended!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="User 1"
                  className="w-10 h-10 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-800">Jane Doe</h4>
                  <p className="text-sm text-gray-600">Patient</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                "The real-time tracking feature is a game-changer. It saved me so much time!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="User 2"
                  className="w-10 h-10 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-800">John Smith</h4>
                  <p className="text-sm text-gray-600">Patient</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                "I love how secure and user-friendly this platform is. Great job!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="User 3"
                  className="w-10 h-10 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-800">Maria Garcia</h4>
                  <p className="text-sm text-gray-600">Patient</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2023 Vaccine Appointment Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;