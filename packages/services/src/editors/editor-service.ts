import type {
  EditorContribution,
  EditorProvider,
  IEditorExtensionPoint,
  Disposable,
} from '@orcher/workbench-plugin-api';

interface RegisteredEditor {
  contribution: EditorContribution;
  provider?: EditorProvider;
  pluginId: string;
}

/**
 * Editor service - manages editor registration and lookup
 */
export class EditorService implements IEditorExtensionPoint {
  private editors = new Map<string, RegisteredEditor>();

  /**
   * Register an editor contribution from manifest
   */
  registerContribution(contribution: EditorContribution, pluginId: string): void {
    if (this.editors.has(contribution.id)) {
      console.warn(`Editor already registered: ${contribution.id}`);
      return;
    }

    this.editors.set(contribution.id, {
      contribution,
      pluginId,
    });
  }

  /**
   * Register an editor provider
   */
  registerProvider(editorId: string, provider: EditorProvider, pluginId: string): Disposable {
    let editor = this.editors.get(editorId);

    if (!editor) {
      // Create implicit registration
      editor = {
        contribution: { id: editorId, name: editorId },
        pluginId,
      };
      this.editors.set(editorId, editor);
    }

    editor.provider = provider;

    return {
      dispose: () => {
        const e = this.editors.get(editorId);
        if (e) {
          e.provider = undefined;
        }
      },
    };
  }

  /**
   * Find the best editor for a resource
   */
  findEditor(uri: string, type?: string): { id: string; name: string } | undefined {
    // First try to match by scheme
    const scheme = uri.split('://')[0];

    for (const [id, editor] of this.editors) {
      const selector = editor.contribution.selector;
      if (!selector) continue;

      // Match by scheme
      if (selector.scheme && selector.scheme === scheme) {
        return { id, name: editor.contribution.name };
      }

      // Match by filename pattern
      if (selector.filenamePattern) {
        const filename = uri.split('/').pop() || '';
        const pattern = new RegExp(
          selector.filenamePattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
        );
        if (pattern.test(filename)) {
          return { id, name: editor.contribution.name };
        }
      }

      // Match by mime type
      if (selector.mimeType && type === selector.mimeType) {
        return { id, name: editor.contribution.name };
      }
    }

    // Return first available editor as fallback
    const first = this.editors.values().next().value;
    if (first) {
      return { id: first.contribution.id, name: first.contribution.name };
    }

    return undefined;
  }

  /**
   * Get an editor provider
   */
  getEditorProvider(editorId: string): EditorProvider | undefined {
    return this.editors.get(editorId)?.provider;
  }

  /**
   * Get all registered editors
   */
  getEditors(): EditorContribution[] {
    return Array.from(this.editors.values()).map((e) => e.contribution);
  }
}
