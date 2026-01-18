import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'enjoy',
  description: 'The repo is the game',
  base: '/enjoy/',
  
  themeConfig: {
    logo: '/logo.png',
    
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Rules', link: '/rules/' },
      { text: 'Levels', link: '/levels/' },
      { text: 'API', link: '/api/' },
      { text: 'Play Now', link: 'https://github.com/[USERNAME]/enjoy' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'How to Play', link: '/guide/how-to-play' },
            { text: 'First Contribution', link: '/guide/first-contribution' }
          ]
        },
        {
          text: 'Concepts',
          items: [
            { text: 'The Levels', link: '/guide/levels' },
            { text: 'Scoring System', link: '/guide/scoring' },
            { text: 'Validation', link: '/guide/validation' },
            { text: 'Achievements', link: '/guide/achievements' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Contributing Code', link: '/guide/contributing-code' },
            { text: 'Rule Engine', link: '/guide/rule-engine' },
            { text: 'Builder System', link: '/guide/builder' }
          ]
        }
      ],
      
      '/rules/': [
        {
          text: 'Rules by Level',
          items: [
            { text: 'Overview', link: '/rules/' },
            { text: 'Level 0: Image', link: '/rules/level-0' },
            { text: 'Level 1: HTML', link: '/rules/level-1' },
            { text: 'Level 2: CSS', link: '/rules/level-2' },
            { text: 'Level 3: JavaScript', link: '/rules/level-3' },
            { text: 'Level 4: Canvas', link: '/rules/level-4' },
            { text: 'Level 5: Mystery', link: '/rules/level-5' }
          ]
        },
        {
          text: 'Validation',
          items: [
            { text: 'How Validation Works', link: '/rules/validation' },
            { text: 'Common Errors', link: '/rules/common-errors' },
            { text: 'Security', link: '/rules/security' }
          ]
        }
      ],
      
      '/levels/': [
        {
          text: 'Level Specifications',
          items: [
            { text: 'Overview', link: '/levels/' },
            { text: 'Level 0: The Void', link: '/levels/00-image' },
            { text: 'Level 1: HTML Awakening', link: '/levels/01-html' },
            { text: 'Level 2: Chromatic Surge', link: '/levels/02-css' },
            { text: 'Level 3: Sentience', link: '/levels/03-js' },
            { text: 'Level 4: Pixel Dimension', link: '/levels/04-canvas' },
            { text: 'Level 5: ???', link: '/levels/05-mystery' }
          ]
        }
      ],
      
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'State Schema', link: '/api/state' },
            { text: 'Rule Schema', link: '/api/rules' },
            { text: 'Level Schema', link: '/api/levels' },
            { text: 'Validation API', link: '/api/validation' },
            { text: 'Builder API', link: '/api/builder' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/[USERNAME]/enjoy' }
    ],

    footer: {
      message: 'The repo is the game. The game is the repo.',
      copyright: 'MIT Licensed | Built with collective imagination'
    },

    search: {
      provider: 'local'
    }
  }
})
