import Card from "./Card";
import LinkButton from "./LinkButton";

export default function EmptyState({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <Card>
      <div className="py-8 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
        {href && action && (
          <div className="mt-4">
            <LinkButton href={href} text={action} />
          </div>
        )}
      </div>
    </Card>
  );
}
