import * as vscode from "vscode";
import { detectIncrementer } from "./incrementer-facade";

/**
 * Activates the Insert Number extension.
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(PREVIEW_DECORATION);
  context.subscriptions.push(
    vscode.commands.registerCommand("insert-number.insertNumber", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showInformationMessage("Insert Number requires an active editor.");
        return;
      }

      const inputBox = vscode.window.createInputBox();
      inputBox.title = "Insert Number";
      inputBox.prompt = "Support: 0, 1, 01, [1], a, ①, Nov 30, 2026-12-31 23:59:58";
      inputBox.placeholder = "0, 1, 01, [1], a, ①, Nov 30, 2026-12-31 23:59:58";
      inputBox.ignoreFocusOut = true;

      const clearPreview = () => {
        editor.setDecorations(PREVIEW_DECORATION, []);
      };

      const renderPreview = (value: string) => {
        const incrementer = detectIncrementer(value);
        if (!incrementer) {
          inputBox.validationMessage = undefined;
          clearPreview();
          return;
        }

        inputBox.validationMessage = undefined;
        editor.setDecorations(
          PREVIEW_DECORATION,
          editor.selections.map((selection, index) =>
            createPreviewDecoration(editor.document, selection, incrementer(index))
          )
        );
      };

      inputBox.onDidChangeValue(renderPreview);
      inputBox.onDidAccept(async () => {
        const incrementer = detectIncrementer(inputBox.value);
        if (!incrementer) {
          clearPreview();
          inputBox.hide();
          return;
        }

        const selections = [...editor.selections];
        await editor.edit((editBuilder) => {
          selections.forEach((selection, index) => {
            editBuilder.replace(getInsertionRange(editor.document, selection), incrementer(index));
          });
        });

        clearPreview();
        inputBox.hide();
      });
      inputBox.onDidHide(() => {
        clearPreview();
        inputBox.dispose();
      });

      renderPreview(inputBox.value);
      inputBox.show();
    })
  );
}

/**
 * Deactivates the Insert Number extension.
 */
export function deactivate(): void {}

const PREVIEW_DECORATION = vscode.window.createTextEditorDecorationType({
  color: "transparent",
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
});

function getInsertionRange(document: vscode.TextDocument, selection: vscode.Selection): vscode.Range {
  const activeLine = document.lineAt(selection.active.line);
  if (activeLine.isEmptyOrWhitespace) {
    return new vscode.Range(activeLine.range.start, activeLine.range.end);
  }

  return selection;
}

function createPreviewDecoration(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  contentText: string
): vscode.DecorationOptions {
  const range = getInsertionRange(document, selection);
  const position = document.lineAt(selection.active.line).text.length === 0 || !range.isEmpty ? "before" : "after";

  return {
    range,
    renderOptions: {
      [position]: { contentText }
    }
  };
}
