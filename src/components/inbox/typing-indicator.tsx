const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="message-bubble-lead inline-flex items-center gap-1 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export { TypingIndicator }
