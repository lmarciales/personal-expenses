import { ArrowRight, Send } from "lucide-react";
import { Button } from "./ui/button";

const QuickTransfer = () => {
  const contacts = [
    { id: 1, name: "User 1", image: "https://github.com/shadcn.png" },
    { id: 2, name: "User 2", image: "https://github.com/shadcn.png" },
    { id: 3, name: "User 3", image: "https://github.com/shadcn.png" },
    { id: 4, name: "User 4", image: "https://github.com/shadcn.png" },
  ];

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Send className="w-4 h-4 text-purple-500" /> Quick Transfer
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
        >
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="mt-auto">
        <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Recent Contacts</p>
        <div className="flex items-center justify-between mb-6">
          <div className="flex -space-x-3 overflow-hidden p-1">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="relative transition-transform hover:-translate-y-1 hover:z-10 cursor-pointer"
              >
                <img
                  src={contact.image}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full border-2 border-background shadow-lg"
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 bg-surface-overlay border-glass hover:border-primary hover:text-primary transition-colors hover:bg-surface-overlay-heavy shadow-lg"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex space-x-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl bg-surface-overlay border-glass hover:bg-surface-hover-strong hover:text-foreground h-12 font-semibold"
          >
            Request Money
          </Button>
          <Button className="flex-1 rounded-xl shadow-glow-lg hover:shadow-glow-xl transition-shadow h-12 font-bold">
            Send Money
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickTransfer;
