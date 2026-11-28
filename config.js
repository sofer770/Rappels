/* כתובת שרת ההתראות. באתר של השרת עצמו (workers.dev) - אותו אתר. בכל כתובת אחרת (למשל tz.el-habriut.co.il ב-GitHub Pages) - השרת ב-Cloudflare. */
// באפליקציית האנדרואיד הכתובת היא localhost, אבל השרת הוא תמיד ב-Cloudflare.
var tzNative = !!(self.Capacitor && self.Capacitor.isNativePlatform && self.Capacitor.isNativePlatform());
self.TZ_API = self.TZ_API || (!tzNative && /\.workers\.dev$|^localhost$|^127\.0\.0\.1$/.test(self.location.hostname) ? '' : 'https://rappels.hasofer7.workers.dev');
