describe('Express app', () => {
  it('can be required without throwing', () => {
    expect(() => {
      require('../src/app');
    }).not.toThrow();
  });

  it('exports an Express app instance', () => {
    const app = require('../src/app');
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});
