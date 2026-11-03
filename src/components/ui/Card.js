// Contenedor con fondo de superficie. `as` permite usarlo como <section>, <article>...
export default function Card({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag className={`rounded-lg border border-border bg-surface p-4 ${className}`} {...props}>
      {children}
    </Tag>
  );
}
