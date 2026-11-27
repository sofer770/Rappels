/* כתובת שרת ההתראות. באתר של השרת עצמו (workers.dev) - אותו אתר. בכל כתובת אחרת (למשל tz.el-habriut.co.il ב-GitHub Pages) - השרת ב-Cloudflare. */
self.TZ_API = self.TZ_API || (/\.workers\.dev$|^localhost$|^127\.0\.0\.1$/.test(self.location.hostname) ? '' : 'https://rappels.hasofer7.workers.dev');
