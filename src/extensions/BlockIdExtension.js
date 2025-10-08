import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const BlockIdExtension = Extension.create({
  name: 'blockId',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          blockId: {
            default: null,
            parseHTML: element => element.getAttribute('data-block-id'),
            renderHTML: attributes => {
              if (!attributes.blockId) {
                return {}
              }
              return {
                'data-block-id': attributes.blockId,
              }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockIdPlugin'),
        props: {
          // Inject HTML comments before each block
          decorations: (state) => {
            // This would typically use decorations, but for HTML comments
            // we'll handle it in the DOM directly via a mutation observer
            return null
          },
        },
        view() {
          return {
            update: (view) => {
              // Inject HTML comments into DOM for debugging
              requestAnimationFrame(() => {
                const blocks = view.dom.querySelectorAll('[data-block-id]')
                blocks.forEach(block => {
                  const blockId = block.getAttribute('data-block-id')
                  if (blockId && !block.hasAttribute('data-comment-injected')) {
                    // Mark as injected to avoid duplicates
                    block.setAttribute('data-comment-injected', 'true')
                    
                    // Create comment node
                    const comment = document.createComment(` id: ${blockId} `)
                    
                    // Insert comment before the block
                    if (block.parentNode && !block.previousSibling?.nodeType === 8) {
                      block.parentNode.insertBefore(comment, block)
                    }
                  }
                })
              })
            },
          }
        },
      }),
    ]
  },
})

export default BlockIdExtension

