// מחזק את התזמון של תוסף ההתראות: במקום שעון מעורר "רגיל" משתמשים בשעון מעורר
// מסוג AlarmClock (כמו אפליקציית השעון). אנדרואיד ושיאומי נותנים לו עדיפות
// ומפעילים אותו גם כשהאפליקציה סגורה ובמצב חיסכון.
const fs = require('fs');
const f = 'node_modules/@capacitor/local-notifications/android/src/main/kotlin/com/capacitorjs/plugins/localnotifications/LocalNotificationManager.kt';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TZ_ALARM_CLOCK')) { console.log('already patched'); process.exit(0); }
const from = 'alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent)';
if (!s.includes(from)) throw new Error('patch target not found in ' + f);
const to = `try { // TZ_ALARM_CLOCK
                    val showIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
                    val showFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                    val show = PendingIntent.getActivity(context, 0, showIntent, showFlags)
                    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(trigger, show), pendingIntent)
                } catch (e: Exception) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent)
                }`;
s = s.replace(from, to);
fs.writeFileSync(f, s);
console.log('patched', f);
