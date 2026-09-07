interface ChatDrawerProps {
  open: boolean;
}

export function ChatDrawer({ open }: ChatDrawerProps) {
  if (!open) return null;
  return (
    <aside className="chat-drawer" aria-label="Chat">
      <div className="pane-label">Chat</div>
      <p>
        Chat stays closed until you open it. It is a tool, not a permanent panel, and it does not
        sit beside the inspector.
      </p>
    </aside>
  );
}
