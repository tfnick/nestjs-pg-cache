import { paramsKeyFormat } from '../src/utils/params-key-format';

describe('paramsKeyFormat', () => {
    // Mock function with named parameters
    async function deleteUserCache(userId: number, type: number) {
        return true;
    }

    // Mock function with index parameters
    async function deleteUserCacheByIndex(param1: number, param2: number) {
        return true;
    }

    it('should resolve named parameters correctly', () => {
        const args = [1, 2];
        const key = paramsKeyFormat(deleteUserCache, '{userId}-{type}', args);
        expect(key).toBe('1-2');
    });

    it('should resolve index parameters correctly', () => {
        const args = [10, 20];
        const key = paramsKeyFormat(deleteUserCacheByIndex, '{0}-{1}', args);
        expect(key).toBe('10-20');
    });

    it('should return null for invalid/missing parameters', () => {
        const args = [1, 2];
        // 'invalid' param does not exist in deleteUserCache
        const key = paramsKeyFormat(deleteUserCache, '{userId}-{invalid}', args);
        expect(key).toBeNull();
    });

    it('should handle partial matches correctly if valid', () => {
        // This depends on implementation, but assuming strict matching for entire template or partial replacement? 
        // Based on previous context, it likely builds the whole string.
        // If {invalid} is missing, it returns null as per the user's manual test expectation.
        const args = [1, 2];
        const key = paramsKeyFormat(deleteUserCache, 'prefix:{userId}', args);
        expect(key).toBe('prefix:1');
    });
});
