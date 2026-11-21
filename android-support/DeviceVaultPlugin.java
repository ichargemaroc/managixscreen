package app.screenflow.player;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "DeviceVault")
public class DeviceVaultPlugin extends Plugin {
  private static final String ALIAS = "screenflow_device_identity";
  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
    if (!store.containsAlias(ALIAS)) {
      KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      gen.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
      gen.generateKey();
    }
    return (SecretKey) store.getKey(ALIAS, null);
  }
  @PluginMethod public void write(PluginCall call) {
    try {
      String value = call.getString("value"); if (value == null) { call.reject("Missing value"); return; }
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
      String encrypted = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
      String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
      boolean committed = getContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE).edit().putString("cipher", encrypted).putString("iv", iv).commit();
      if (!committed) { call.reject("Secure storage unavailable", "VAULT_WRITE_FAILED"); return; } call.resolve();
    } catch (Exception e) { call.reject("Secure storage unavailable", "VAULT_WRITE_FAILED"); }
  }
  @PluginMethod public void read(PluginCall call) {
    try {
      var prefs = getContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE);
      String encrypted = prefs.getString("cipher", null), iv = prefs.getString("iv", null);
      JSObject result = new JSObject();
      if ((encrypted == null) != (iv == null)) {
        call.reject("Secure storage incomplete", "VAULT_INCOMPLETE"); return;
      }
      if (encrypted != null && iv != null) {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        result.put("value", new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8));
      }
      call.resolve(result);
    } catch (Exception e) { call.reject("Secure storage unavailable", "VAULT_READ_FAILED"); }
  }
  @PluginMethod public void clear(PluginCall call) {
    boolean committed = getContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE).edit().clear().commit();
    if (!committed) { call.reject("Secure storage unavailable", "VAULT_CLEAR_FAILED"); return; }
    call.resolve();
  }
}