package il.co.elhabriut.tizkorot;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** פרטי המכשיר והגרסה, ופתיחת מסכי ההגדרות שהיצרנים מסתירים (למשל "הפעלה אוטומטית" בשיאומי). */
@CapacitorPlugin(name = "TzDevice")
public class TzDevicePlugin extends Plugin {

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        try {
            PackageInfo p = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("version", p.versionName);
        } catch (Exception e) {
            r.put("version", "?");
        }
        r.put("maker", Build.MANUFACTURER);
        r.put("model", Build.MODEL);
        r.put("android", Build.VERSION.RELEASE);
        String m = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase();
        String[] strict = { "xiaomi", "redmi", "poco", "oppo", "realme", "vivo", "huawei", "honor", "oneplus", "meizu", "asus", "letv", "tecno", "infinix" };
        boolean aggressive = false;
        for (String x : strict) if (m.contains(x)) aggressive = true;
        r.put("aggressive", aggressive);
        r.put("battery", batteryOk());
        call.resolve(r);
    }

    @PluginMethod
    public void openAutostart(PluginCall call) {
        String m = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        String[][] targets = {
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
            { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
            { "com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity" }
        };
        for (String[] t : targets) {
            try {
                Intent i = new Intent();
                i.setComponent(new ComponentName(t[0], t[1]));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject();
                r.put("opened", "autostart");
                call.resolve(r);
                return;
            } catch (Exception ignored) {}
        }
        openDetails(call);
    }

    private boolean batteryOk() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void requestBattery(PluginCall call) {
        JSObject r = new JSObject();
        if (batteryOk()) { r.put("battery", true); call.resolve(r); return; }
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception ignored) {}
        }
        r.put("battery", false);
        call.resolve(r);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        openDetails(call);
    }

    private void openDetails(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            JSObject r = new JSObject();
            r.put("opened", "details");
            call.resolve(r);
        } catch (Exception e) {
            call.reject("לא הצלחתי לפתוח את ההגדרות");
        }
    }
}
