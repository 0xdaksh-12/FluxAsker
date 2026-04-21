# FluxAsker 🧠📺

An AI-powered Chrome Extension that transforms YouTube videos into interactive Q&A sessions. It extracts YouTube transcripts and enables instant, timestamp-grounded Q&A using local browser embeddings, LangChain, and the Groq API.

## Features
- **Local RAG Pipeline:** Leverages Transformers.js for 100% local, privacy-first web-worker text chunk embeddings utilizing `MemoryVectorStore`.
- **Fast AI Inference:** Utilizes the Groq API (`llama-3.1-8b-instant`) to fetch grounded answers at incredibly high typing speeds.
- **Timestamp Tracking:** Generates clickable timestamps (e.g., `[01:25]`) that dynamically control and skip your active YouTube video player.
- **Premium Aesthetics:** Fully integrated with custom dark-themed claymorphism UI structures using Vanilla CSS.

## Getting Started

### Prerequisites
- Node.js environment (v20+)
- `pnpm` Package Manager (or your preferred manager like `npm` / `yarn`)
- A [Groq API Key](https://console.groq.com/) for LLM inference.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/0xdaksh-12/FluxAsker.git
   cd FluxAsker
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory and add your Groq API Key:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

3. **Install Dependencies:**
   ```bash
   pnpm install
   ```

4. **Build the extension:**
   ```bash
   pnpm build
   ```

### Loading into Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click the **Load unpacked** button.
4. Select the generated `dist` folder located inside the `FluxAsker` repository.

## Usage
1. Pin the FluxAsker extension to your extension bar.
2. Visit any YouTube video that contains closed captions.
3. Open the extension popup, click on **Process Video**.
4. Once completed, chat normally! FluxAsker will provide timestamp references. Clicking a timestamp directly changes your video's timeline.

## Technology Stack
- **Vite** & `@crxjs/vite-plugin` (Manifest V3)
- **LangChain Core & Groq** (`@langchain/core`, `@langchain/groq`)
- **Transformers.js** (`@xenova/transformers`)
- **Vanilla Claymorphism CSS**

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
