package il.co.elhabriut.tizkorot;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.util.List;
import java.util.Locale;

/** תזכורות לפי מיקום: הרשאות, מיקום נוכחי, חיפוש כתובת ורישום אזורים (Geofence) שמקפיצים התראה גם כשהאפליקציה סגורה. */
@CapacitorPlugin(
    name = "TzGeo",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "background", strings = { "android.permission.ACCESS_BACKGROUND_LOCATION" })
    }
)
public class TzGeoPlugin extends Plugin {

    private boolean has(String p) {
        return ContextCompat.checkSelfPermission(getContext(), p) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean fine() { return has(Manifest.permission.ACCESS_FINE_LOCATION); }

    private boolean background() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || has("android.permission.ACCESS_BACKGROUND_LOCATION");
    }

    private JSObject state() {
        JSObject r = new JSObject();
        r.put("fine", fine());
        r.put("background", background());
        r.put("count", GeoStore.count(getContext()));
        return r;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(state()); }

    @PluginMethod
    public void requestLocation(PluginCall call) {
        if (fine()) { call.resolve(state()); return; }
        requestPermissionForAlias("location", call, "permCb");
    }

    @PluginMethod
    public void requestBackground(PluginCall call) {
        if (background()) { call.resolve(state()); return; }
        if (!fine()) { requestPermissionForAlias("location", call, "permCb"); return; }
        requestPermissionForAlias("background", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) {
        GeoStore.register(getContext());
        call.resolve(state());
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void current(PluginCall call) {
        if (!fine() && !has(Manifest.permission.ACCESS_COARSE_LOCATION)) { call.reject("no-permission"); return; }
        try {
            LocationServices.getFusedLocationProviderClient(getContext())
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener(loc -> {
                    if (loc == null) { call.reject("no-location"); return; }
                    JSObject r = new JSObject();
                    r.put("lat", loc.getLatitude());
                    r.put("lng", loc.getLongitude());
                    r.put("accuracy", loc.getAccuracy());
                    call.resolve(r);
                })
                .addOnFailureListener(e -> call.reject("no-location"));
        } catch (Exception e) {
            call.reject("no-location");
        }
    }

    @PluginMethod
    public void search(PluginCall call) {
        final String q = call.getString("q", "");
        final Double lat = call.getDouble("lat");
        final Double lng = call.getDouble("lng");
        new Thread(() -> {
            try {
                Geocoder g = new Geocoder(getContext(), new Locale("he", "IL"));
                @SuppressWarnings("deprecation")
                List<Address> list = lat != null && lng != null
                    ? g.getFromLocation(lat, lng, 1)
                    : g.getFromLocationName(q, 6);
                JSArray arr = new JSArray();
                if (list != null) for (Address a : list) {
                    JSObject o = new JSObject();
                    StringBuilder name = new StringBuilder();
                    for (int i = 0; i <= a.getMaxAddressLineIndex(); i++) { if (i > 0) name.append(", "); name.append(a.getAddressLine(i)); }
                    o.put("name", name.length() > 0 ? name.toString() : (a.getFeatureName() != null ? a.getFeatureName() : q));
                    o.put("lat", a.getLatitude());
                    o.put("lng", a.getLongitude());
                    arr.put(o);
                }
                JSObject r = new JSObject();
                r.put("results", arr);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("search-failed");
            }
        }).start();
    }

    @PluginMethod
    public void setFences(PluginCall call) {
        JSArray fences = call.getArray("fences");
        GeoStore.saveFromApp(getContext(), fences == null ? new JSArray() : fences);
        GeoStore.register(getContext());
        call.resolve(state());
    }
}
