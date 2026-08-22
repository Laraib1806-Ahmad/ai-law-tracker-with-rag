import { useState } from "react";
import { FaBalanceScale, FaSearch, FaExternalLinkAlt } from "react-icons/fa";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    setSources([]);

    const response = await fetch("/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullAnswer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);

        if (data.sources) setSources(data.sources);
        if (data.token) {
          fullAnswer += data.token;
          setAnswer(fullAnswer);
        }
      }
    }

    setLoading(false);
  }

  return (
    <div className="page">
      <div className="card">
        <h1>
          <FaBalanceScale /> AI Law Assistant
        </h1>
        <p className="subtitle">Ask anything about AI regulations</p>

        <div className="input-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. what AI laws exist in California"
          />
          <button onClick={ask} disabled={loading}>
            <FaSearch /> {loading ? "Asking..." : "Ask"}
          </button>
        </div>

        <div className="answer-box">
          {answer || "Your answer will appear here ✨"}
        </div>

        <div className="sources">
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="source-chip"
            >
              {s.title} ({s.jurisdiction}) <FaExternalLinkAlt size={10} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
