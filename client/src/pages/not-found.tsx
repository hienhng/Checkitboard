
import { useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  // If we're at the root path, don't show the 404
  if (location === "/") {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-4">The page you are looking for does not exist.</p>
        <a href="/" className="text-blue-500 hover:text-blue-600">
          Return Home
        </a>
      </div>
    </div>
  );
}
