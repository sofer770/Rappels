package il.co.elhabriut.tizkorot;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;
import org.json.JSONObject;

/** מקפיץ את התזכורת כשנכנסים למקום או יוצאים ממנו. */
public class GeoReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            GeoStore.register(c);
            return;
        }
        GeofencingEvent ev = GeofencingEvent.fromIntent(intent);
        if (ev == null || ev.hasError() || ev.getTriggeringGeofences() == null) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        for (Geofence g : ev.getTriggeringGeofences()) {
            JSONObject f = GeoStore.find(c, g.getRequestId());
            if (f == null) continue;
            String channel = "tz2_" + f.optString("sound", "chime");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(channel) == null) {
                channel = "tz_geo";
                if (nm.getNotificationChannel(channel) == null)
                    nm.createNotificationChannel(new NotificationChannel(channel, "תזכורות לפי מיקום", NotificationManager.IMPORTANCE_HIGH));
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            if (open == null) open = new Intent();
            open.putExtra("tzGeo", f.optString("rid"));
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            int id = 700000 + Math.abs(g.getRequestId().hashCode() % 90000);
            PendingIntent pi = PendingIntent.getActivity(c, id, open, flags);
            String place = f.optString("place", "");
            String body = (f.optBoolean("exit") ? "יצאת מ" : "הגעת ל") + (place.isEmpty() ? "מקום" : place);
            if (!f.optString("notes").isEmpty()) body += "\n" + f.optString("notes");
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel)
                .setSmallIcon(c.getResources().getIdentifier("ic_stat_bell", "drawable", c.getPackageName()))
                .setColor(0xFF4F46E5)
                .setContentTitle("📍 " + f.optString("title", "תזכורת"))
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(pi);
            try { nm.notify(id, b.build()); } catch (Exception ignored) {}
            if (f.optBoolean("once", true)) GeoStore.markFired(c, g.getRequestId());
        }
    }
}
