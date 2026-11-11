// The body of the email as a list of blocks. Each block says what it is, edits in place and can move
// up/down or go away. "+ Add" offers only what this email can use (its boxes, its link fields).
import { Menu, MenuButton, MenuItem, MenuItems, MenuSection, MenuHeading } from "@headlessui/react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";

import { inputClass } from "../../../bookings/new/fields";
import { isLinkField } from "./tokens";
import { TokenField } from "./TokenField";
import { newBlockId } from "./useTemplateEditor";

const KIND = {
  heading: { label: "Title", hint: null },
  text: { label: "Paragraph", hint: "Leave an empty line to start a new paragraph." },
  button: { label: "Button" },
  card: { label: "Details box" },
  note: { label: "Small print" },
  divider: { label: "Line" },
};

function IconButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex size-9 items-center justify-center text-ink-muted transition-colors disabled:opacity-30",
        danger ? "hover:text-alert" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function ButtonBlock({ block, onChange, tokens }) {
  const links = tokens.fields.filter((f) => isLinkField(f.name));
  const isCustom = !links.some((f) => block.url === `{{ ${f.name} }}`);
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <TokenField label="Button text" value={block.label ?? ""} onChange={(label) => onChange({ label })} tokens={{ ...tokens, fields: [] }} />
      <div className="min-w-0">
        <label className="field-label" htmlFor={`${block.id}-link`}>
          Opens
        </label>
        <select
          id={`${block.id}-link`}
          value={isCustom ? "custom" : block.url}
          onChange={(e) => onChange({ url: e.target.value === "custom" ? "https://" : e.target.value })}
          className={inputClass}
        >
          {links.map((f) => (
            <option key={f.name} value={`{{ ${f.name} }}`}>
              {f.label}
            </option>
          ))}
          <option value="custom">A web address…</option>
        </select>
        {isCustom && (
          <input
            aria-label="Web address"
            type="url"
            value={block.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://"
            className={clsx(inputClass, "mt-2")}
          />
        )}
      </div>
    </div>
  );
}

function CardBlock({ block, onChange, cards, available }) {
  const card = cards[block.card];
  return (
    <div className="space-y-2">
      <select aria-label="Which details" value={block.card} onChange={(e) => onChange({ card: e.target.value })} className={inputClass}>
        {available.map((c) => (
          <option key={c} value={c}>
            {cards[c]?.label ?? c}
          </option>
        ))}
      </select>
      {card && <p className="text-small text-ink-muted">Filled in for each client. Empty lines are left out.</p>}
    </div>
  );
}

function Block({ block, index, count, onChange, onMove, onRemove, tokens, cards, availableCards }) {
  const kind = KIND[block.type] ?? { label: block.type };
  const set = (patch) => onChange(block.id, patch);
  return (
    <li className="group border-t border-line py-5 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <span className="caps text-ink-muted">{kind.label}</span>
        <div className="-mr-2 flex items-center opacity-100 transition-opacity md:opacity-40 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>
            <ArrowUpIcon className="size-4" />
          </IconButton>
          <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(index, 1)}>
            <ArrowDownIcon className="size-4" />
          </IconButton>
          <IconButton label={`Remove ${kind.label.toLowerCase()}`} danger onClick={() => onRemove(block.id)}>
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="mt-2">
        {block.type === "heading" && (
          <TokenField label="Title" value={block.text ?? ""} onChange={(text) => set({ text })} tokens={tokens} inputClassName="text-[1.375rem]" />
        )}
        {block.type === "text" && (
          <TokenField label="Text" value={block.text ?? ""} onChange={(text) => set({ text })} tokens={tokens} multiline rows={4} hint={kind.hint} />
        )}
        {block.type === "note" && (
          <TokenField label="Text" value={block.text ?? ""} onChange={(text) => set({ text })} tokens={tokens} multiline rows={2} inputClassName="text-small" />
        )}
        {block.type === "button" && <ButtonBlock block={block} onChange={set} tokens={tokens} />}
        {block.type === "card" && <CardBlock block={block} onChange={set} cards={cards} available={availableCards} />}
        {block.type === "divider" && <hr className="mt-2 border-line-strong" />}
      </div>
    </li>
  );
}

function AddMenu({ onAdd, cards, availableCards, tokens }) {
  const firstLink = tokens.fields.find((f) => isLinkField(f.name));
  const items = [
    { type: "heading", text: "" },
    { type: "text", text: "" },
    { type: "button", label: "", url: firstLink ? `{{ ${firstLink.name} }}` : "https://" },
    { type: "note", text: "" },
    { type: "divider" },
  ];
  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex min-h-11 items-center gap-2 border border-dashed border-line-strong px-4 text-small text-ink transition-colors hover:border-ink">
        <PlusIcon className="size-4" aria-hidden="true" />
        Add
      </MenuButton>
      <MenuItems anchor="top start" modal={false} className="z-50 mb-1 w-64 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none">
        <MenuSection>
          {items.map((b) => (
            <MenuItem key={b.type}>
              <button type="button" onClick={() => onAdd(b)} className="flex min-h-10 w-full items-center px-4 text-left text-small text-ink data-focus:bg-paper-alt">
                {KIND[b.type].label}
              </button>
            </MenuItem>
          ))}
        </MenuSection>
        {availableCards.length > 0 && (
          <MenuSection className="border-t border-line">
            <MenuHeading className="caps px-4 pt-2 pb-1 text-ink-muted">Details box</MenuHeading>
            {availableCards.map((c) => (
              <MenuItem key={c}>
                <button type="button" onClick={() => onAdd({ type: "card", card: c })} className="flex min-h-10 w-full items-center px-4 text-left text-small text-ink data-focus:bg-paper-alt">
                  {cards[c]?.label ?? c}
                </button>
              </MenuItem>
            ))}
          </MenuSection>
        )}
      </MenuItems>
    </Menu>
  );
}

export function BlockList({ blocks, onChangeBlocks, tokens, cards, availableCards }) {
  const update = (id, patch) => onChangeBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i, dir) =>
    onChangeBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(i, 1);
      next.splice(i + dir, 0, b);
      return next;
    });
  const remove = (id) => onChangeBlocks((bs) => bs.filter((b) => b.id !== id));
  const add = (b) => onChangeBlocks((bs) => [...bs, { ...b, id: newBlockId() }]);

  return (
    <div>
      {blocks.length === 0 && <p className="py-6 text-small text-ink-muted">This email is empty. Add a title and a paragraph to start.</p>}
      <ul>
        {blocks.map((b, i) => (
          <Block
            key={b.id}
            block={b}
            index={i}
            count={blocks.length}
            onChange={update}
            onMove={move}
            onRemove={remove}
            tokens={tokens}
            cards={cards}
            availableCards={availableCards}
          />
        ))}
      </ul>
      <div className="border-t border-line pt-5">
        <AddMenu onAdd={add} cards={cards} availableCards={availableCards} tokens={tokens} />
      </div>
    </div>
  );
}

IconButton.propTypes = { label: PropTypes.string, onClick: PropTypes.func, disabled: PropTypes.bool, danger: PropTypes.bool, children: PropTypes.node };
ButtonBlock.propTypes = { block: PropTypes.object, onChange: PropTypes.func, tokens: PropTypes.object };
CardBlock.propTypes = { block: PropTypes.object, onChange: PropTypes.func, cards: PropTypes.object, available: PropTypes.array };
Block.propTypes = {
  block: PropTypes.object,
  index: PropTypes.number,
  count: PropTypes.number,
  onChange: PropTypes.func,
  onMove: PropTypes.func,
  onRemove: PropTypes.func,
  tokens: PropTypes.object,
  cards: PropTypes.object,
  availableCards: PropTypes.array,
};
AddMenu.propTypes = { onAdd: PropTypes.func, cards: PropTypes.object, availableCards: PropTypes.array, tokens: PropTypes.object };
BlockList.propTypes = {
  blocks: PropTypes.array.isRequired,
  onChangeBlocks: PropTypes.func.isRequired,
  tokens: PropTypes.object.isRequired,
  cards: PropTypes.object.isRequired,
  availableCards: PropTypes.array.isRequired,
};
