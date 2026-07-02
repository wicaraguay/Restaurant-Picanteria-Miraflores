
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: ['node_modules', 'dist', '**/*.spec.js', 'dist/**/*.test.js'],
        env: {
            MASTER_ENCRYPTION_KEY: 'test-master-key-for-testing-only-32chars!'
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 70,
                lines: 80
            },
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
                'vitest.config.ts',
                'src/seed.ts',
                'src/seedHR.ts',
                '**/*.spec.ts',
                '**/*.test.ts'
            ]
        }
    },
});
