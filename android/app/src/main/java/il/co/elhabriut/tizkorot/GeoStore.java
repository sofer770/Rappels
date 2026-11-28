package il.co.elhabriut.tizkorot;

import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** שומר את רשימת המקומות בטלפון ורושם אותם מחדש במערכת (גם אחרי הפעלה מחדש של הטלפון). */
public class GeoStore {
    static final String PREFS = "tz_geo";

    static void save(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("fences", json).apply();
    }

    /** שומר מקומות חדשים מהאפליקציה, בלי אלה שכבר הקפיצו תזכורת חד פעמית. */
    static void saveFromApp(Context c, JSONArray in) {
        java.util.Set<String> fired = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet("fired", new java.util.HashSet<>());
        JSONArray out = new JSONArray();
        for (int i = 0; i < in.length(); i++) {
            JSONObject o = in.optJSONObject(i);
            if (o != null && !fired.contains(o.optString("id"))) out.put(o);
        }
        save(c, out.toString());
    }

    static void markFired(Context c, String id) {
        android.content.SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        java.util.Set<String> fired = new java.util.HashSet<>(p.getStringSet("fired", new java.util.HashSet<>()));
        fired.add(id);
        p.edit().putStringSet("fired", fired).apply();
        remove(c, id);
    }

    static JSONArray load(Context c) {
        try { return new JSONArray(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("fences", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    static int count(Context c) { return load(c).length(); }

    static JSONObject find(Context c, String id) {
        JSONArray a = load(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return o;
        }
        return null;
    }

    static void remove(Context c, String id) {
        JSONArray a = load(c), out = new JSONArray();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && !id.equals(o.optString("id"))) out.put(o);
        }
        save(c, out.toString());
        List<String> ids = new ArrayList<>();
        ids.add(id);
        try { LocationServices.getGeofencingClient(c).removeGeofences(ids); } catch (Exception ignored) {}
    }

    static PendingIntent intent(Context c) {
        Intent i = new Intent(c, GeoReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
        return PendingIntent.getBroadcast(c, 4242, i, flags);
    }

    @SuppressLint("MissingPermission")
    static void register(Context c) {
        GeofencingClient client = LocationServices.getGeofencingClient(c);
        PendingIntent pi = intent(c);
        try { client.removeGeofences(pi); } catch (Exception ignored) {}
        if (ContextCompat.checkSelfPermission(c, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        JSONArray a = load(c);
        List<Geofence> list = new ArrayList<>();
        for (int i = 0; i < a.length() && list.size() < 95; i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            boolean exit = "exit".equals(o.optString("on"));
            list.add(new Geofence.Builder()
                .setRequestId(o.optString("id"))
                .setCircularRegion(o.optDouble("lat"), o.optDouble("lng"), (float) Math.max(100, o.optDouble("radius", 200)))
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(exit ? Geofence.GEOFENCE_TRANSITION_EXIT : Geofence.GEOFENCE_TRANSITION_ENTER)
                .setNotificationResponsiveness(60000)
                .build());
        }
        if (list.isEmpty()) return;
        GeofencingRequest req = new GeofencingRequest.Builder()
            .setInitialTrigger(0)
            .addGeofences(list)
            .build();
        try { client.addGeofences(req, pi); } catch (Exception ignored) {}
    }
}
