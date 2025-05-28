import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Main Content */}
      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="bg-gray-800/80 backdrop-blur-sm p-8 md:p-12 w-full max-w-4xl rounded-xl border border-gray-700 shadow-2xl">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                Welcome to <span className="text-blue-400">DropVault</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Your secure academic hub for documents, code, and collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <button
                  onClick={() => navigate("/main")}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/30"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="px-8 py-3.5 bg-transparent text-white border-2 border-gray-600 hover:border-blue-400 rounded-lg font-medium hover:text-blue-400 transition-all duration-200"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          </div>

          <div className="mt-16 animate-bounce">
            <svg
              className="w-14 h-14 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powerful <span className="text-blue-400">Features</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Designed specifically for student productivity
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-blue-400 transition-all duration-300 group">
              <div className="w-16 h-16 mb-6 mx-auto bg-gray-700 rounded-lg flex items-center justify-center text-blue-400 text-2xl group-hover:bg-blue-400 group-hover:text-white transition-all">
                📄
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Document Storage</h3>
              <p className="text-gray-400 text-center">
                Secure cloud storage with version history and organization tools.
              </p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-blue-400 transition-all duration-300 group">
              <div className="w-16 h-16 mb-6 mx-auto bg-gray-700 rounded-lg flex items-center justify-center text-blue-400 text-2xl group-hover:bg-blue-400 group-hover:text-white transition-all">
                💻
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Code Sharing</h3>
              <p className="text-gray-400 text-center">
                Real-time collaboration with syntax highlighting.
              </p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-blue-400 transition-all duration-300 group">
              <div className="w-16 h-16 mb-6 mx-auto bg-gray-700 rounded-lg flex items-center justify-center text-blue-400 text-2xl group-hover:bg-blue-400 group-hover:text-white transition-all">
                🖼️
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Media Library</h3>
              <p className="text-gray-400 text-center">
                Visual content management with smart tagging.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl">
          <h3 className="text-3xl font-bold mb-6">Ready to transform your workflow?</h3>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of students already using DropVault
          </p>
          <button
            onClick={() => navigate("/register")}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/30"
          >
            Get Started Now
          </button>
        </section>
      </main>
    </div>
  );
}