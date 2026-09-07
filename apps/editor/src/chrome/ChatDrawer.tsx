interface ChatDrawerProps {
  open: boolean;
}

export function ChatDrawer({ open }: ChatDrawerProps) {
  if (!open) return null;
  return (
    <aside className="chat-drawer" aria-label="Chat">
      <div className="pane-label">Chat</div>
      <p>
        Chat stays closed until you open it. Generation is not configured. This panel does not
        invent a diagram or a reply.
      </p>
    </aside>
  );
}
