# MisIntel - AI-Powered Misinformation Detection Tool

![MisIntel Logo](https://img.shields.io/badge/MisIntel-AI%20Powered%20Fact%20Checker-blue?style=for-the-badge&logo=shield-check)

## 🎯 Project Overview

MisIntel is an innovative, AI-powered solution that helps users combat misinformation by providing comprehensive content verification. Built for the Google Gen-AI hackathon, this tool goes beyond simple fact-checking to educate users on identifying credible, trustworthy content.

## ✨ Key Features

- **Multi-Input Support**: Verify text, URLs, and images
- **4 AI Models Integration**: Google Fact Check, Custom Search, Safe Browsing, and Gemini AI
- **Real-time Analysis**: Get results in under 3 seconds
- **Educational Insights**: Learn why content is flagged with detailed explanations
- **Privacy-First**: No data storage, complete user anonymity
- **Responsive Design**: Beautiful UI built with Aceternity UI components

## 🚀 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Aceternity UI, Tailwind CSS
- **AI Services**: Google Gemini AI, Google Fact Check API
- **APIs**: Google Custom Search, Safe Browsing API
- **Styling**: Tailwind CSS with custom animations
- **Deployment**: Vercel-ready

## 🏗️ Architecture

```
MisIntel/
├── Frontend (Next.js)
│   ├── Hero Section with animated effects
│   ├── Fact Check Tool with 3 input types
│   ├── Feature showcase with hover effects
│   ├── How it works with sticky scroll
│   └── Footer with contact information
├── Backend (API Routes)
│   ├── Advanced Check API (main verification)
│   ├── Test API (development testing)
│   └── Multi-API integration
└── AI Models
    ├── Google Fact Check Tools
    ├── Custom Search Engine
    ├── Safe Browsing
    └── Gemini AI Analysis
```

## 🎨 UI Components

### Aceternity UI Components Used
- **BackgroundBeams**: Dynamic background effects
- **Spotlight**: Interactive light effects
- **TypewriterEffect**: Animated text typing
- **MovingBorder**: Animated button borders
- **CardSpotlight**: Enhanced card interactions
- **BackgroundGradient**: Gradient borders
- **HoverEffect**: Interactive card hover effects
- **StickyScroll**: Scroll-triggered animations

### Custom Enhancements
- Enhanced color schemes and gradients
- Improved typography and spacing
- Custom animations and transitions
- Responsive design for all devices
- Glass morphism effects
- Enhanced loading states

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Cloud API keys

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/misintel.git
   cd misintel
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   # --- Fact Check + Gemini API Key (combined) ---
   FACT_GEMINI_API_KEY=your_fact_gemini_api_key_here

   # --- Safe Browsing ---
   SAFE_BROWSING_API_KEY=your_safebrowsing_api_key_here

   # --- Custom Search ---
   CUSTOM_SEARCH_API_KEY=your_customsearch_api_key_here
   GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id

   # --- App Config ---
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   The first key (FACT_GEMINI_API_KEY) is used for both Fact Check and Gemini services, so you only need to generate and set one key.
   Replace all placeholders with your actual API keys.
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 API Configuration

### Required Google APIs
1. **Google Fact Check Tools API**
   - Enable in Google Cloud Console
   - Used for fact-checking claims

2. **Google Custom Search API**
   - Create a custom search engine
   - Used for web content verification

3. **Google Safe Browsing API**
   - Enable for URL safety checks
   - Protects against malicious links

4. **Google Gemini AI**
   - Enable Gemini API
   - Used for comprehensive content analysis

### API Rate Limits
- Fact Check: 10,000 requests/day
- Custom Search: 100 requests/day (free tier)
- Safe Browsing: 10,000 requests/day
- Gemini: 15 requests/minute

## 📱 Features in Detail

### 1. Text Verification
- Paste any text content for analysis
- AI-powered language pattern detection
- Fact-check database cross-referencing

### 2. URL Verification
- Analyze web pages and articles
- Extract and verify content
- Check URL safety and reputation

### 3. Multi-Model Analysis
- Combines results from 4 AI models
- Confidence scoring system
- Detailed reasoning and sources

## 🎯 Hackathon Features

### Core Requirements ✅
- [x] User input (URL/text) handling
- [x] Backend API for analysis
- [x] Fact-check API integration
- [x] Results display (True/False + summary)

### Enhanced Features ✅
- [x] Beautiful Aceternity UI components
- [x] Multiple input types (text, URL, image)
- [x] "Why flagged?" explanations
- [x] Traffic light confidence system
- [x] History tab with localStorage
- [x] Share functionality
- [x] Responsive design
- [x] Educational insights

### Bonus Features ✅
- [x] Advanced animations and effects
- [x] Multiple spotlight effects
- [x] Enhanced typography and spacing
- [x] Professional color schemes
- [x] Interactive hover effects
- [x] Smooth transitions

## 🔍 How It Works

1. **Input Processing**: User provides text or URL
2. **Multi-API Analysis**: Content analyzed by 4 different AI models
3. **Cross-Referencing**: Results compared across fact-check databases
4. **AI Synthesis**: Gemini AI provides comprehensive analysis
5. **Result Generation**: Confidence score, summary, and reasoning
6. **User Education**: Detailed explanations and learning resources

## 🎨 Design Philosophy

### Visual Design
- **Modern Aesthetic**: Clean, professional interface
- **Typography**: Clear, readable fonts with proper hierarchy
- **Spacing**: Generous whitespace for better readability

### User Experience
- **Intuitive Interface**: Easy-to-use fact-checking tool
- **Educational Focus**: Learn while verifying content
- **Privacy Assurance**: Clear privacy messaging
- **Accessibility**: Responsive design for all devices

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site deployment
- **AWS Amplify**: Full-stack deployment
- **Google Cloud Run**: Containerized deployment

## 🔒 Privacy & Security

- **No Data Storage**: All processing in real-time
- **No User Tracking**: Complete anonymity
- **Secure APIs**: HTTPS-only communication
- **Privacy First**: Built with privacy by design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Cloud**: For providing the hackathon platform
- **Aceternity UI**: For beautiful UI components
- **Next.js Team**: For the amazing React framework
- **Open Source Community**: For inspiration and support

## 📞 Contact

- **Project**: [MisIntel GitHub](https://github.com/yourusername/misintel)
- **Email**: support@misintel.ai
- **Website**: [misintel.ai](https://misintel.ai)

---

**Built with ❤️ for a more informed world**

*MisIntel - Your AI-powered shield against misinformation*
