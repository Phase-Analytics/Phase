import { Elysia } from 'elysia';
const plugin = new Elysia({ name: 'auth' }).macro(({ onBeforeHandle }: any) => ({
  requireAuth(enabled: boolean) { if (!enabled) return; onBeforeHandle(({ set }: any) => { set.status = 401; return 'blocked-v1'; }); },
}));
const plugin2 = new Elysia({ name: 'auth2' }).macro({
  requireAuth2(enabled: boolean) { if (!enabled) return; return { beforeHandle({ set }: any) { set.status = 401; return 'blocked-v2'; } }; },
});
const a = new Elysia().use(plugin).get('/a', () => 'handler-ran', { requireAuth: true } as any);
const b = new Elysia().use(plugin2).get('/b', () => 'handler-ran', { requireAuth2: true } as any);
const c = new Elysia().get('/c', () => 'plain');
for (const [app, p] of [[a, '/a'], [b, '/b'], [c, '/c']] as const) { const r = await app.handle(new Request('http://localhost' + p)); console.log(p, r.status, await r.text()); }
