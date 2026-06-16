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

export default function App() {
  const [page, setPage] = useState("conversation");
  const [schedule, setSchedule] = useState(null);

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
  }

  return (
    <>
      {page === "conversation" && (
        <ConversationPage onScheduleReady={onScheduleReady} onReset={handleReset} />
      )}
      {page === "schedule" && (
        <SchedulePage
          schedule={schedule}
          onScheduleUpdated={onScheduleUpdated}
          onReset={handleReset}
        />
      )}
    </>
  );
}
