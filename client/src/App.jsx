// App.jsx — top-level component
// Controls which page is shown: conversation (talking to the duck) or
// schedule (viewing + editing the generated plan).
//
// State held here:
//   page     — 'conversation' | 'schedule'
//   schedule — the schedule object from the LLM ({ tasks, schedule })
//              passed down to SchedulePage for rendering

import { useState } from "react";
import ConversationPage from "./pages/ConversationPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import HelpModal from "./components/HelpModal.jsx";
import styles from "./App.module.css";

export default function App() {
  const [page, setPage] = useState("conversation");
  const [schedule, setSchedule] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  function onScheduleReady(newSchedule) {
    setSchedule(newSchedule);
    setPage("schedule");
  }

  function onScheduleUpdated(newSchedule) {
    setSchedule(newSchedule);
  }

  // Clears the duck's memory by dropping the session ID — the next request
  // will generate a fresh one, starting a new conversation server-side.
  function handleReset() {
    sessionStorage.removeItem("ducks-session-id");
    setSchedule(null);
    setPage("conversation");
    setResetKey((k) => k + 1);
  }

  return (
    <div className={styles.app}>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <header className={styles.header}>
        <span className={styles.title}>Ducks in a Row</span>
        <button className={styles.helpBtn} onClick={() => setShowHelp(true)} aria-label="Help">?</button>
      </header>
      {page === "conversation" && (
        <ConversationPage key={resetKey} onScheduleReady={onScheduleReady} onReset={handleReset} />
      )}
      {page === "schedule" && (
        <SchedulePage
          schedule={schedule}
          onScheduleUpdated={onScheduleUpdated}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
