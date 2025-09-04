import { useNavigate } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";
import { useState, useEffect } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  // Auto-rotate features every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigation = async (path: string) => {
    setIsNavigating(true);
    // Small delay for visual feedback
    setTimeout(() => {
      navigate(path);
      setIsNavigating(false);
    }, 300);
  };

  const features = [
    {
      icon: "📝",
      title: "Smart Notes",
      description: "Encrypted note-taking with rich text formatting and real-time sync across all your devices.",
      color: "blue"
    },
    {
      icon: "💻",
      title: "Code Editor",
      description: "Multi-language code editor with syntax highlighting and integrated compiler for instant testing.",
      color: "green"
    },
    {
      icon: "🏠",
      title: "Collaboration Rooms",
      description: "Create private rooms to share notes, code, and collaborate with your study groups seamlessly.",
      color: "purple"
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Students", icon: "👨‍🎓" },
    { number: "50K+", label: "Notes Created", icon: "📝" },
    { number: "25K+", label: "Code Snippets", icon: "💻" },
    { number: "5K+", label: "Study Rooms", icon: "🏠" }
  ];

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-ping"></div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Loading DropVault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-24 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="bg-gray-800/60 backdrop-blur-xl p-8 md:p-12 w-full max-w-5xl rounded-2xl border border-gray-700/50 shadow-2xl">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent animate-pulse">
                  DropVault
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  {user ? (
                    <>Welcome back! Your secure academic hub awaits with all your notes, code, and collaborations.</>
                  ) : (
                    <>Your secure academic hub for encrypted notes, collaborative coding, and seamless study group management.</>
                  )}
                </p>
              </div>

              {/* Action buttons based on auth status */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                {user ? (
                  <>
                    <button
                      onClick={() => handleNavigation("/main")}
                      disabled={isNavigating}
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <div className="relative flex items-center space-x-2">
                        {isNavigating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading Vault...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span>Open My Vault</span>
                          </>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleNavigation("/rooms")}
                      disabled={isNavigating}
                      className="group px-8 py-4 bg-transparent text-white border-2 border-gray-600 hover:border-purple-400 rounded-xl font-semibold hover:text-purple-400 transition-all duration-300 hover:bg-purple-400/10 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>My Rooms</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleNavigation("/register")}
                      disabled={isNavigating}
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <div className="relative flex items-center space-x-2">
                        {isNavigating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Free Today</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleNavigation("/login")}
                      disabled={isNavigating}
                      className="group px-8 py-4 bg-transparent text-white border-2 border-gray-600 hover:border-blue-400 rounded-xl font-semibold hover:text-blue-400 transition-all duration-300 hover:bg-blue-400/10 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </div>
                    </button>
                  </>
                )}
              </div>

              {/* User greeting for authenticated users */}
              {user && (
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl backdrop-blur-sm">
                  <p className="text-blue-300 text-lg">
                    Welcome back! Ready to continue your learning journey?
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 animate-bounce">
            <svg
              className="w-12 h-12 text-blue-400 cursor-pointer hover:text-blue-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </section>

        {/* Stats Section - only for non-authenticated users */}
        {!user && (
          <section className="py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-6 bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{stat.icon}</div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">{stat.number}</div>
                  <div className="text-gray-400 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {user ? (
                <>Your <span className="text-blue-400">Toolkit</span> Awaits</>
              ) : (
                <>Powerful <span className="text-blue-400">Features</span></>
              )}
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {user ? (
                "Everything you need to excel in your academic journey, all in one place"
              ) : (
                "Designed specifically for student productivity and collaboration"
              )}
            </p>
          </div>
         
          {/* Interactive feature showcase */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              {/* Feature preview */}
              <div className="order-2 lg:order-1">
                <div className="bg-gray-800/60 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
                  <div className={`text-6xl mb-6 text-center transition-all duration-500 ${
                    currentFeature === 0 ? 'scale-110 text-blue-400' : 
                    currentFeature === 1 ? 'scale-110 text-green-400' : 
                    'scale-110 text-purple-400'
                  }`}>
                    {features[currentFeature].icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-center">{features[currentFeature].title}</h3>
                  <p className="text-gray-300 text-center leading-relaxed">{features[currentFeature].description}</p>
                </div>
              </div>

              {/* Feature navigation */}
              <div className="order-1 lg:order-2 space-y-4">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-300 ${
                      currentFeature === index
                        ? `border-${feature.color}-500 bg-${feature.color}-500/10`
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`text-3xl transition-transform ${currentFeature === index ? 'scale-110' : ''}`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold mb-1">{feature.title}</h4>
                        <p className="text-gray-400 text-sm">{feature.description.substring(0, 60)}...</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="text-center bg-gradient-to-r from-gray-800/80 via-gray-700/80 to-gray-800/80 backdrop-blur-xl rounded-3xl p-12 border border-gray-700/50 shadow-2xl">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              {user ? (
                "Ready to dive back into your work?"
              ) : (
                "Ready to transform your academic workflow?"
              )}
            </h3>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              {user ? (
                "Your notes, code, and collaborations are just a click away"
              ) : (
                "Join thousands of students already using DropVault to boost their productivity"
              )}
            </p>
            <button
              onClick={() => handleNavigation(user ? "/main" : "/register")}
              disabled={isNavigating}
              className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center space-x-2">
                {isNavigating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>{user ? "Open DropVault" : "Get Started Now"}</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}