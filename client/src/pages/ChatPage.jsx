import { useCallback, useEffect, useState } from 'react';
import { fetchAppointmentsRequest, createAppointmentRequest } from '../api/appointmentsApi.js';
import {
  fetchChatSessionRequest,
  sendChatMessageRequest,
  startChatSessionRequest,
} from '../api/chatApi.js';
import { AppointmentForm } from '../components/AppointmentForm.jsx';
import { AppointmentList } from '../components/AppointmentList.jsx';
import { ChatWindow } from '../components/ChatWindow.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  buildChatMessageForDisplay,
  buildSessionStorageKey,
  lastMessageIsFromAssistant,
} from '../utils/utils.js';

// How often the browser asks the backend for new messages while it waits.
const POLL_INTERVAL_MS = 1500;

// The main page: chat on one side, your appointments on the other.
// Use this as the home page for anyone who is logged in.
export function ChatPage() {
  const { currentUser } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);

  const [isStartingNewChat, setIsStartingNewChat] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    isVisible: false,
    suggestedAppointment: null,
    missingDetails: [],
  });

  // Fetches the user's appointments and puts them in the side panel.
  // Use this on load and after every new booking.
  const refreshAppointments = useCallback(async () => {
    try {
      const data = await fetchAppointmentsRequest();
      setAppointments(data.appointments);
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [showErrorToast]);

  // Fetches the latest messages of the conversation from the backend.
  // Use this on load and on each poll while waiting for the assistant.
  const refreshMessages = useCallback(async (idToLoad) => {
    const data = await fetchChatSessionRequest(idToLoad);
    setMessages(data.session.messages || []);
    return data.session.messages || [];
  }, []);

  // Continues the saved conversation, or starts a fresh one if there is none.
  // Use this once when the page opens.
  useEffect(() => {
    let hasUnmounted = false;

    // Reopens the saved conversation, or starts a fresh one if there is none.
    // Use this once when the chat page first appears.
    async function openConversation() {
      const storageKey = buildSessionStorageKey(currentUser.id);
      const savedSessionId = window.localStorage.getItem(storageKey);

      try {
        if (savedSessionId) {
          const previousMessages = await fetchChatSessionRequest(savedSessionId)
            .then((data) => data.session.messages || [])
            .catch(() => null);

          if (previousMessages && !hasUnmounted) {
            setSessionId(savedSessionId);
            setMessages(previousMessages);
            return;
          }
        }

        const data = await startChatSessionRequest();
        if (hasUnmounted) return;
        window.localStorage.setItem(storageKey, data.session.id);
        setSessionId(data.session.id);
        setMessages([]);
      } catch (error) {
        if (!hasUnmounted) showErrorToast(error.message);
      } finally {
        if (!hasUnmounted) setIsLoadingHistory(false);
      }
    }

    openConversation();
    refreshAppointments();

    return () => {
      hasUnmounted = true;
    };
  }, [currentUser.id, refreshAppointments, showErrorToast]);

  // While a reply is on its way, keep asking the backend for new messages.
  // This is the near real time part; it stops as soon as the reply arrives.
  useEffect(() => {
    if (!isWaitingForReply || !sessionId) return undefined;

    const pollTimer = window.setInterval(async () => {
      try {
        const latestMessages = await refreshMessages(sessionId);
        if (lastMessageIsFromAssistant(latestMessages)) {
          setIsWaitingForReply(false);
        }
      } catch {
        // A single failed poll is not worth bothering the user about. The next
        // poll, or the send request itself, will report a real problem.
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, [isWaitingForReply, sessionId, refreshMessages]);

  // Sends what the user typed and deals with whatever the assistant decides.
  // Use this from the chat input box.
  async function handleSendMessage(content) {
    if (!sessionId) {
      showErrorToast('The chat is still starting up. Please try again in a moment.');
      return;
    }

    // Show the message immediately so the chat feels responsive.
    setMessages((current) => [...current, buildChatMessageForDisplay('user', content)]);
    setIsWaitingForReply(true);
    setBookingForm({ isVisible: false, suggestedAppointment: null, missingDetails: [] });

    try {
      const result = await sendChatMessageRequest({ sessionId, content });

      if (result.needsAppointmentForm) {
        setBookingForm({
          isVisible: true,
          suggestedAppointment: result.suggestedAppointment,
          missingDetails: result.missingDetails,
        });
      }

      if (result.createdAppointment) {
        showSuccessToast('Your appointment has been booked.');
        refreshAppointments();
      }
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsWaitingForReply(false);
      // The backend is the source of truth, so finish on its version of the chat.
      refreshMessages(sessionId).catch(() => {});
    }
  }

  // Saves a booking made through the fallback form.
  // Use this when the user confirms the form the assistant offered.
  async function handleSubmitAppointmentForm(details) {
    setIsSavingAppointment(true);
    try {
      await createAppointmentRequest(details);
      showSuccessToast('Your appointment has been booked.');
      setBookingForm({ isVisible: false, suggestedAppointment: null, missingDetails: [] });
      refreshAppointments();
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsSavingAppointment(false);
    }
  }

  // Hides the fallback form without booking anything.
  // Use this when the user would rather keep typing in the chat.
  function handleDismissAppointmentForm() {
    setBookingForm({ isVisible: false, suggestedAppointment: null, missingDetails: [] });
  }

  // Clears the screen and begins a fresh conversation with no history.
  // Use this for the new chat button, when the user wants to start over.
  async function handleStartNewChat() {
    setIsStartingNewChat(true);
    try {
      const data = await startChatSessionRequest();
      window.localStorage.setItem(buildSessionStorageKey(currentUser.id), data.session.id);
      setSessionId(data.session.id);
      setMessages([]);
      setBookingForm({ isVisible: false, suggestedAppointment: null, missingDetails: [] });
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsStartingNewChat(false);
    }
  }

  return (
    <main className="page-content chat-layout">
      <div className="chat-column">
        <ChatWindow
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          isWaitingForReply={isWaitingForReply}
          isStartingNewChat={isStartingNewChat}
          onSendMessage={handleSendMessage}
          onStartNewChat={handleStartNewChat}
        />

        {bookingForm.isVisible && (
          <AppointmentForm
            suggestedAppointment={bookingForm.suggestedAppointment}
            missingDetails={bookingForm.missingDetails}
            onSubmit={handleSubmitAppointmentForm}
            onDismiss={handleDismissAppointmentForm}
            isSaving={isSavingAppointment}
          />
        )}
      </div>

      <div className="side-column">
        <AppointmentList appointments={appointments} isLoading={isLoadingAppointments} />
      </div>
    </main>
  );
}
