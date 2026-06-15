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

  // Called by ConversationPage when the duck returns a schedule.
  // Saves the schedule and switches to the plan view.
  function onScheduleReady(newSchedule) {
    setSchedule(newSchedule);
    setPage("schedule");
  }

  // Called by SchedulePage when the duck updates the plan mid-conversation.
  function onScheduleUpdated(newSchedule) {
    setSchedule(newSchedule);
  }

  return (
    <>
      {page === "conversation" && (
        <ConversationPage onScheduleReady={onScheduleReady} />
      )}
      {page === "schedule" && (
        <SchedulePage
          schedule={schedule}
          onScheduleUpdated={onScheduleUpdated}
        />
      )}
    </>
  );
}
