import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  {
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
]

export default config