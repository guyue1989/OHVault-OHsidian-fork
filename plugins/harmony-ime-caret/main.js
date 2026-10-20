'use strict';

const { Plugin } = require('obsidian');
const { EditorView } = require('@codemirror/view');
const { Transaction } = require('@codemirror/state');

// 输入法整对提交、而 Obsidian 的 closeBrackets 完全不认识的成对符号。
// 这些只由鸿蒙输入法补全，所以修正光标位置的活只能由插件做。
const IME_PAIRS = ['《》', '〈〉', '「」', '『』', '【】', '〔〕', '（）', '［］', '｛｝', '“”', '‘’'];

// Obsidian 自己会补全这些；只有当输入法抢先把整对提交、导致 CM 的补全没介入时，才需要修正。
const OVERLAP_PAIRS = ['()', '[]', '{}', '""', "''"];

const WHOLE_PAIR = new Set();
const FULLWIDTH_PAIR = new Set();
const CLOSER_TO_OPENER = new Map();
for (const pair of IME_PAIRS) {
  WHOLE_PAIR.add(pair);
  FULLWIDTH_PAIR.add(pair);
  CLOSER_TO_OPENER.set(pair.charAt(1), pair.charAt(0));
}
for (const pair of OVERLAP_PAIRS) WHOLE_PAIR.add(pair);

function caretCorrection(update) {
  const view = update.view;
  if (view.state.readOnly) return;

  const tr = update.transactions[0];
  const event = tr.annotation(Transaction.userEvent);
  const isInputEvent = typeof event === 'string';
  if (isInputEvent) {
    if (!event.startsWith('input')) return;
    if (/paste|drop|drag|complete|history|undo|redo/.test(event)) return;
  } else if (event !== undefined) {
    return;
  }

  const before = tr.startState.selection;
  if (before.ranges.length !== 1 || !before.main.empty) return;

  let runs = 0;
  let from = 0;
  let text = '';
  tr.changes.iterChanges((fA, fB, tA, tB, inserted) => {
    runs++;
    from = tA;
    text = inserted.toString();
  });
  if (runs !== 1 || !text) return;

  const head = view.state.selection.main;
  if (head.from !== head.to || head.to !== from + text.length) return;

  let open;
  let close;
  let target;
  if (text.length === 2 && WHOLE_PAIR.has(text) && (isInputEvent || FULLWIDTH_PAIR.has(text))) {
    open = text.charAt(0);
    close = text.charAt(1);
    target = from + 1;
  } else if (isInputEvent && text.length === 1 && CLOSER_TO_OPENER.has(text)) {
    open = CLOSER_TO_OPENER.get(text);
    close = text;
    target = from;
  } else {
    return;
  }

  // 让输入法把这次提交彻底处理完再动光标，否则 dispatch 会打断组合输入。
  setTimeout(() => {
    if (view.destroyed) return;
    const state = view.state;
    const sel = state.selection.main;
    if (sel.from !== sel.to || sel.head !== target + 1) return;
    if (state.sliceDoc(target - 1, target) !== open) return;
    if (state.sliceDoc(target, target + 1) !== close) return;
    view.dispatch({ selection: { anchor: target } });
  }, 0);
}

module.exports = class HarmonyImeCaret extends Plugin {
  async onload() {
    this.registerEditorExtension(
      EditorView.updateListener.of((update) => {
        if (update.docChanged && update.transactions.length === 1) caretCorrection(update);
      })
    );
  }
};
