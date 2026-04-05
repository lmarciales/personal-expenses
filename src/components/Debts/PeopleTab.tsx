import type { PersonCombinedGroup, SimpleAccount } from "@/hooks/useDebtsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { ChevronRight, User, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PersonDetail } from "./PersonDetail";

interface PeopleTabProps {
  groups: PersonCombinedGroup[];
  accounts: SimpleAccount[];
  onSettled: () => void;
}

export const PeopleTab = ({ groups, accounts, onSettled }: PeopleTabProps) => {
  const { t } = useTranslation("debts");
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
        <h3 className="text-lg font-semibold mb-2">{t("people.empty")}</h3>
        <p className="text-muted-foreground text-sm">{t("people.emptyDescription")}</p>
      </div>
    );
  }

  const togglePerson = (person: string) => {
    setExpandedPersons((prev) => {
      const next = new Set(prev);
      if (next.has(person)) next.delete(person);
      else next.add(person);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedPersons.has(group.person);
        const itemCount = group.iOweItems.length + group.owedToMeItems.length;

        return (
          <div
            key={group.person}
            className={`glass-card rounded-2xl overflow-hidden transition-all ${
              isExpanded ? "ring-1 ring-indigo-500/50" : ""
            }`}
          >
            {/* Card Header */}
            <button
              type="button"
              onClick={() => togglePerson(group.person)}
              className="w-full p-5 flex items-center justify-between hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{group.person}</h3>
                  <p className="text-xs text-muted-foreground">{t("people.pendingItems", { count: itemCount })}</p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t("people.iOwe")}</p>
                  <p
                    className={`text-sm font-semibold ${group.totalIOwe > 0 ? "text-danger" : "text-muted-foreground"}`}
                  >
                    {formatCOPWithSymbol(group.totalIOwe)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t("people.owedToMe")}</p>
                  <p
                    className={`text-sm font-semibold ${group.totalOwedToMe > 0 ? "text-success" : "text-muted-foreground"}`}
                  >
                    {formatCOPWithSymbol(group.totalOwedToMe)}
                  </p>
                </div>
                <div className="text-right min-w-[120px]">
                  <p className="text-xs text-muted-foreground">{t("people.net")}</p>
                  <p
                    className={`text-base font-bold ${
                      group.netBalance > 0
                        ? "text-success"
                        : group.netBalance < 0
                          ? "text-danger"
                          : "text-muted-foreground"
                    }`}
                  >
                    {group.netBalance >= 0 ? "+" : "-"}
                    {formatCOPWithSymbol(Math.abs(group.netBalance))}
                  </p>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
              <div className="border-t border-subtle">
                <PersonDetail
                  person={group.person}
                  iOweItems={group.iOweItems}
                  owedToMeItems={group.owedToMeItems}
                  accounts={accounts}
                  onSuccess={onSettled}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
