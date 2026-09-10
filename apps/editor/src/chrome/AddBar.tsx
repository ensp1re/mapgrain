import { useRef, useState } from "react";
import type { NodeKind } from "@mapgrain/document";
import { kindTitle } from "../constants/kind.ts";
import { KindIcon } from "../diagram/KindIcon.tsx";
import { Button } from "../ui/Button.tsx";
import { MenuItem } from "../ui/Menu.tsx";
import { Overlay } from "../ui/Overlay.tsx";

interface AddBarProps {
  kinds: NodeKind[];
  groupLabel?: string;
  onAddNode: (kind: NodeKind) => void;
  onAddGroup: () => void;
  onConnect: () => void;
  canConnect: boolean;
}

export function AddBar({
  kinds,
  groupLabel = "group",
  onAddNode,
  onAddGroup,
  onConnect,
  canConnect,
}: AddBarProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <div className="add-bar" role="toolbar" aria-label="Library">
      <Button
        ref={trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Add"
      >
        Add component
      </Button>
      <Overlay open={open} anchorRef={trigger} onClose={() => setOpen(false)} align="start" pattern="menu" label="Add component">
        {kinds.map((kind) => (
          <MenuItem
            key={kind}
            icon={<KindIcon kind={kind} />}
            onClick={() => {
              onAddNode(kind);
              setOpen(false);
            }}
          >
            {kindTitle(kind)}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            onAddGroup();
            setOpen(false);
          }}
        >
          {groupLabel === "lane" ? "Lane" : "Group"}
        </MenuItem>
      </Overlay>
      {canConnect ? <Button onClick={onConnect}>Connect</Button> : null}
    </div>
  );
}
