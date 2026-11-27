package il.co.elhabriut.tizkorot;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TzDevicePlugin.class);
        registerPlugin(TzGeoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
