import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { api, preview, supabase } from "./src/service";
import { en } from "./src/i18n";
import { DimensionImageViewer } from "./src/DimensionImageViewer";
import { demoProducts } from "./src/demo";
import { restoreCart, mergeGuestCart } from "./src/cart";
import type { Line, Order, Product, Profile, Variant } from "./src/types";

const emptyProfile: Profile = {
  name: "",
  company: "",
  country: "",
  phone: "",
  address: "",
};
const money = (n: number | null) =>
  n === null ? "—" : `USD ${Number(n).toFixed(2)}`;
type Pending = { key: string; items: Line[]; locale: "en" };
export default function App() {
  return (
    <SafeAreaProvider>
      <Shop />
    </SafeAreaProvider>
  );
}
function Shop() {
  const locale = "en";
  const t = en;
  const [tab, setTab] = useState<"products" | "cart" | "orders" | "account">(
    "products",
  );
  const [products, setProducts] = useState<Product[]>(
    preview ? demoProducts : [],
  );
  const [cart, setCart] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dimensionPreview, setDimensionPreview] = useState<{
    uri: string;
    label: string;
  } | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pending = useRef<Pending | null>(null);
  const owner = useRef("");
  function report(error: unknown) {
    const codes: Record<string, string> = {
      LOGIN_REQUIRED: t.loginRequired,
      PRICE_CHANGED: t.priceChanged,
      PROFILE_REQUIRED: t.profileRequired,
      PRODUCT_UNAVAILABLE: t.removed,
      QUOTE_CHANGED: t.quoteChanged,
      INVALID_INPUT: t.invalid,
      KEY_REUSED: t.recovery,
    };
    setNotice(
      error instanceof Error ? codes[error.message] || t.service : t.service,
    );
  }
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await task();
    } catch (e) {
      report(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function catalog() {
    if (preview) return demoProducts;
    const result = await api<{ products: Product[] }>(
      `products?locale=${locale}`,
    );
    setProducts(result.products);
    return result.products;
  }
  async function loadOrders() {
    const result = await api<{ orders: Order[] }>("orders");
    setOrders(result.orders);
  }
  useEffect(() => {
    supabase?.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setNotice(t.service));
    const subscription = supabase?.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => subscription?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!preview)
      api<{ products: Product[] }>(`products?locale=${locale}`)
        .then((r) => {
          if (active) setProducts(r.products);
        })
        .catch((e) => {
          if (active) report(e);
        });
    return () => {
      active = false;
    };
  }, [locale]);
  useEffect(() => {
    let active = true;
    const id = session?.user.id || "guest";
    owner.current = id;
    setReady(false);
    setCart([]);
    pending.current = null;
    setOrders([]);
    setProfile(emptyProfile);
    (async () => {
      const raw = await AsyncStorage.getItem(`shop-cart-${id}`);
      const saved = raw ? JSON.parse(raw) : {};
      let restored = restoreCart(saved.cart);
      const prior =
        saved.pending &&
        Array.isArray(saved.pending.items) &&
        typeof saved.pending.key === "string"
          ? (saved.pending as Pending)
          : null;
      if (id !== "guest" && !prior) {
        const guestRaw = await AsyncStorage.getItem("shop-cart-guest");
        const guest = guestRaw ? restoreCart(JSON.parse(guestRaw).cart) : [];
        if (guest.length) {
          restored = mergeGuestCart(restored, guest);
          await AsyncStorage.setItem(
            `shop-cart-${id}`,
            JSON.stringify({ cart: restored, pending: null }),
          );
          await AsyncStorage.removeItem("shop-cart-guest");
        }
      }
      if (!active) return;
      setCart(restored);
      pending.current = prior;
      setReady(true);
    })().catch(() => {
      if (active) setNotice(t.storage);
    });
    if (session)
      api<{ profile: Profile | null }>("profile")
        .then((r) => {
          if (active && r.profile) setProfile(r.profile);
        })
        .catch((e) => {
          if (active) report(e);
        });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  useEffect(() => {
    if (tab === "orders" && session) void run(loadOrders);
  }, [tab, session?.user.id]);
  async function persist(
    next: Line[],
    nextPending: Pending | null = pending.current,
  ) {
    await AsyncStorage.setItem(
      `shop-cart-${owner.current}`,
      JSON.stringify({ cart: next, pending: nextPending }),
    );
    pending.current = nextPending;
    setCart(next);
  }
  function edit(next: Line[]) {
    if (pending.current) {
      setNotice(t.recovery);
      return;
    }
    void run(() => persist(next));
  }
  function add(p: Product, v: Variant) {
    const n = Number(quantity);
    if (!Number.isSafeInteger(n) || n < 1 || n > 100000) {
      setNotice(t.invalid);
      return;
    }
    if (v.price === null || v.stock === "out_of_stock") return;
    const old = cart.find((l) => l.variantId === v.id);
    if ((old?.quantity || 0) + n > 100000) {
      setNotice(t.invalid);
      return;
    }
    edit(
      old
        ? cart.map((l) =>
            l.variantId === v.id ? { ...l, quantity: l.quantity + n } : l,
          )
        : [
            ...cart,
            {
              variantId: v.id,
              name: p.name,
              sku: v.sku,
              quantity: n,
              unitPrice: Number(v.price),
              unit: v.unit,
              image: p.images[0],
            },
          ],
    );
    setSelected(null);
  }
  async function refreshCart() {
    if (pending.current) {
      setNotice(t.recovery);
      return;
    }
    const current = await catalog();
    let removed = false;
    const next = cart.flatMap((l) => {
      const p = current.find((p) =>
        p.variants.some((v) => v.id === l.variantId),
      );
      const v = p?.variants.find((v) => v.id === l.variantId);
      if (!p || !v || v.price === null || v.stock === "out_of_stock") {
        removed = true;
        return [];
      }
      return [{ ...l, name: p.name, unitPrice: Number(v.price), sku: v.sku }];
    });
    await persist(next);
    setNotice(removed ? t.removed : t.saved);
  }
  async function submit() {
    if (!session) {
      setTab("account");
      setNotice(t.loginRequired);
      return;
    }
    const request = pending.current || {
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
      items: cart,
      locale,
    };
    await persist(cart, request);
    try {
      await api(
        "orders",
        "POST",
        { items: request.items, locale: "en" },
        request.key,
      );
    } catch (e) {
      // A timeout can mean the order committed. Keep the original key and payload for retry.
      if (
        e instanceof Error &&
        [
          "PRICE_CHANGED",
          "PRODUCT_UNAVAILABLE",
          "PROFILE_REQUIRED",
          "INVALID_INPUT",
        ].includes(e.message)
      )
        await persist(cart, null);
      throw e;
    }
    await persist([], null);
    setNotice(t.submitted);
    setTab("orders");
    await loadOrders();
  }
  async function reorder(order: Order) {
    if (pending.current) {
      setNotice(t.recovery);
      return;
    }
    const current = await catalog();
    const next = cart.map((l) => ({ ...l }));
    let removed = false;
    for (const l of order.order_items) {
      const p = current.find((p) =>
        p.variants.some((v) => v.id === l.variant_id),
      );
      const v = p?.variants.find((v) => v.id === l.variant_id);
      if (!p || !v || v.price === null || v.stock === "out_of_stock") {
        removed = true;
        continue;
      }
      const old = next.find((i) => i.variantId === v.id);
      if (old) {
        old.quantity = Math.min(100000, old.quantity + l.quantity);
        old.unitPrice = Number(v.price);
      } else
        next.push({
          variantId: v.id,
          name: p.name,
          sku: v.sku,
          quantity: l.quantity,
          unitPrice: Number(v.price),
          unit: v.unit,
          image: p.images[0],
        });
    }
    await persist(next);
    setTab("cart");
    setNotice(removed ? t.removed : t.review);
  }
  function Button({
    label,
    onPress,
    secondary = false,
    disabled = false,
  }: {
    label: string;
    onPress: () => void;
    secondary?: boolean;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled || busy || !ready}
        onPress={onPress}
        style={[
          s.button,
          secondary && s.secondary,
          (disabled || busy || !ready) && { opacity: 0.45 },
        ]}
      >
        <Text style={[s.buttonText, secondary && { color: "#183d36" }]}>
          {label}
        </Text>
      </Pressable>
    );
  }
  const filtered = products.filter(
    (p) =>
      (!category || p.category === category) &&
      `${p.name} ${p.variants.map((v) => v.sku).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <View>
            <Text style={s.brand}>REPAIR / SUPPLY</Text>
            <Text style={s.tagline}>TRADE ORDERING</Text>
          </View>
        </View>
        {preview && <Text style={s.preview}>{t.preview}</Text>}
        {!!notice && (
          <Pressable onPress={() => setNotice("")}>
            <Text accessibilityLiveRegion="polite" style={s.notice}>
              {notice}
            </Text>
          </Pressable>
        )}
        {busy && <ActivityIndicator color="#183d36" />}
        {tab === "products" ? (
          <View style={s.catalogPage}>
            <View style={s.catalogHeader}>
              <Text style={s.title}>{t.products}</Text>
              <TextInput
                accessibilityLabel={t.search}
                style={s.input}
                placeholder={t.search}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={s.catalogLayout}>
              <View style={s.sidebar}>
                <Text style={s.sidebarHeading}>Categories</Text>
                <ScrollView
                  contentContainerStyle={s.sidebarContent}
                  showsVerticalScrollIndicator={false}
                >
                  {[
                    "",
                    ...new Set(products.map((p) => p.category).filter(Boolean)),
                  ].map((c) => (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`Category: ${c || t.all}`}
                      accessibilityState={{ selected: category === c }}
                      onPress={() => setCategory(c)}
                      style={[
                        s.categoryItem,
                        category === c && s.categorySelected,
                      ]}
                    >
                      <Text
                        style={[
                          s.categoryText,
                          category === c && s.categoryTextSelected,
                        ]}
                      >
                        {c || t.all}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <ScrollView
                style={s.catalogResults}
                contentContainerStyle={s.catalogResultsContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={s.rowBetween}>
                  <Text style={s.catalogCategoryTitle}>
                    {category || t.all}
                  </Text>
                  <Text style={s.muted}>{filtered.length}</Text>
                </View>
                {filtered.map((p, i) => (
                  <Pressable
                    key={p.id}
                    style={[s.product, s.catalogCard]}
                    onPress={() => {
                      setSelected(p);
                      setQuantity("1");
                    }}
                  >
                    <View
                      style={[
                        s.productImage,
                        s.catalogImage,
                        {
                          backgroundColor: ["#e7e5dc", "#deded5", "#e8ded2"][
                            i % 3
                          ],
                        },
                      ]}
                    >
                      {p.images[0] ? (
                        <Image
                          source={{ uri: p.images[0] }}
                          style={s.catalogPhoto}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={s.placeholder}>R / S</Text>
                      )}
                    </View>
                    <View style={s.productInfo}>
                      <Text style={s.eyebrowDark}>{p.category}</Text>
                      <Text style={s.productTitle}>{p.name}</Text>
                      <Text style={s.price}>
                        {p.variants.some((v) => v.price !== null)
                          ? money(
                              Math.min(
                                ...p.variants
                                  .filter((v) => v.price !== null)
                                  .map((v) => Number(v.price)),
                              ),
                            )
                          : t.noPrice}
                      </Text>
                    </View>
                  </Pressable>
                ))}

                {!filtered.length && <Text style={s.empty}>{t.empty}</Text>}
                <Button
                  label={t.refresh}
                  secondary
                  onPress={() =>
                    void run(async () => {
                      await catalog();
                    })
                  }
                />
              </ScrollView>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {tab === "cart" && (
              <>
                <Text style={s.title}>{t.cart}</Text>
                <Text style={s.muted}>{t.review}</Text>
                {cart.map((l) => (
                  <View key={l.variantId} style={s.card}>
                    <Text style={s.productTitle}>{l.name}</Text>
                    <Text style={s.muted}>
                      {l.sku} · {money(l.unitPrice)} / {l.unit}
                    </Text>
                    <View style={s.rowBetween}>
                      <View style={s.row}>
                        <Pressable
                          disabled={busy || !!pending.current}
                          accessibilityLabel={`Decrease ${l.sku}`}
                          style={s.step}
                          onPress={() =>
                            edit(
                              cart.flatMap((x) =>
                                x.variantId === l.variantId
                                  ? x.quantity > 1
                                    ? [{ ...x, quantity: x.quantity - 1 }]
                                    : []
                                  : [x],
                              ),
                            )
                          }
                        >
                          <Text>−</Text>
                        </Pressable>
                        <Text>{l.quantity}</Text>
                        <Pressable
                          disabled={
                            busy || !!pending.current || l.quantity >= 100000
                          }
                          accessibilityLabel={`Increase ${l.sku}`}
                          style={s.step}
                          onPress={() =>
                            edit(
                              cart.map((x) =>
                                x.variantId === l.variantId
                                  ? { ...x, quantity: x.quantity + 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Text>＋</Text>
                        </Pressable>
                      </View>
                      <Text style={s.price}>
                        {money(l.unitPrice * l.quantity)}
                      </Text>
                    </View>
                  </View>
                ))}
                {!cart.length ? (
                  <>
                    <Text style={s.empty}>{t.empty}</Text>
                    <Button
                      label={t.browse}
                      onPress={() => setTab("products")}
                    />
                  </>
                ) : (
                  <>
                    <View style={s.card}>
                      <View style={s.rowBetween}>
                        <Text>{t.subtotal}</Text>
                        <Text style={s.price}>
                          {money(
                            cart.reduce(
                              (sum, l) => sum + l.quantity * l.unitPrice,
                              0,
                            ),
                          )}
                        </Text>
                      </View>
                      <View style={s.rowBetween}>
                        <Text>{t.shipping}</Text>
                        <Text style={s.muted}>{t.pending}</Text>
                      </View>
                    </View>
                    <Button
                      label={t.refreshCart}
                      secondary
                      onPress={() => void run(refreshCart)}
                    />
                    <Button
                      label={t.submit}
                      disabled={preview}
                      onPress={() => void run(submit)}
                    />
                  </>
                )}
              </>
            )}
            {tab === "orders" && (
              <>
                <View style={s.rowBetween}>
                  <Text style={s.title}>{t.orders}</Text>
                  {session && (
                    <Button
                      label={t.refresh}
                      secondary
                      onPress={() => void run(loadOrders)}
                    />
                  )}
                </View>
                {!session ? (
                  <>
                    <Text style={s.empty}>{t.loginRequired}</Text>
                    <Button label={t.login} onPress={() => setTab("account")} />
                  </>
                ) : (
                  <>
                    {!orders.length && <Text style={s.empty}>{t.empty}</Text>}
                    {orders.map((o) => (
                      <View key={o.id} style={s.card}>
                        <View style={s.rowBetween}>
                          <Text style={s.eyebrowDark}>
                            {t.order} #{o.id.slice(0, 8)}
                          </Text>
                          <Text style={s.status}>
                            {t[o.status as keyof typeof t] || o.status}
                          </Text>
                        </View>
                        <Text style={s.muted}>
                          {new Date(o.created_at).toLocaleDateString(locale)}
                        </Text>
                        {o.order_items.map((l, i) => (
                          <View key={i} style={s.orderLine}>
                            <Text style={s.lineName}>
                              {l.product_name} · {l.sku}
                            </Text>
                            <Text>
                              {l.quantity} × {money(l.unit_price)}
                            </Text>
                          </View>
                        ))}
                        <View style={s.rowBetween}>
                          <Text>{t.subtotal}</Text>
                          <Text>{money(o.product_subtotal)}</Text>
                        </View>
                        <View style={s.rowBetween}>
                          <Text>{t.shipping}</Text>
                          <Text>
                            {o.shipping_fee === null
                              ? t.pending
                              : money(o.shipping_fee)}
                          </Text>
                        </View>
                        {o.grand_total !== null && (
                          <View style={s.rowBetween}>
                            <Text style={s.price}>{t.total}</Text>
                            <Text style={s.price}>{money(o.grand_total)}</Text>
                          </View>
                        )}
                        {o.tracking_number && (
                          <Text selectable style={s.muted}>
                            {t.tracking}: {o.shipping_carrier}{" "}
                            {o.tracking_number}
                          </Text>
                        )}
                        {o.status === "quoted" && o.quote_updated_at && (
                          <Button
                            label={t.confirm}
                            onPress={() =>
                              void run(async () => {
                                await api("orders/confirm", "POST", {
                                  id: o.id,
                                  version: o.quote_updated_at,
                                });
                                await loadOrders();
                                setNotice(t.saved);
                              })
                            }
                          />
                        )}
                        <Button
                          label={t.reorder}
                          secondary
                          onPress={() => void run(() => reorder(o))}
                        />
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
            {tab === "account" && (
              <>
                <Text style={s.title}>{t.account}</Text>
                {!session ? (
                  <View style={s.card}>
                    <Text style={s.section}>{t.login}</Text>
                    <TextInput
                      accessibilityLabel={t.email}
                      style={s.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder={t.email}
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v);
                        setSent(false);
                        setCode("");
                      }}
                    />
                    <Button
                      label={t.send}
                      disabled={preview || !email.includes("@")}
                      onPress={() =>
                        void run(async () => {
                          const { error } = await supabase!.auth.signInWithOtp({
                            email: email.trim().toLowerCase(),
                          });
                          if (error) {
                            setNotice(t.otpError);
                            return;
                          }
                          setSent(true);
                          setNotice(t.sent);
                        })
                      }
                    />
                    {sent && (
                      <>
                        <TextInput
                          accessibilityLabel={t.code}
                          style={s.input}
                          keyboardType="number-pad"
                          autoComplete="one-time-code"
                          placeholder={t.code}
                          value={code}
                          onChangeText={setCode}
                        />
                        <Button
                          label={t.verify}
                          onPress={() =>
                            void run(async () => {
                              const { error } = await supabase!.auth.verifyOtp({
                                email: email.trim().toLowerCase(),
                                token: code.trim(),
                                type: "email",
                              });
                              if (error) setNotice(t.otpError);
                            })
                          }
                        />
                      </>
                    )}
                    {preview && <Text style={s.muted}>{t.setup}</Text>}
                  </View>
                ) : (
                  <>
                    <Text style={s.muted}>{session.user.email}</Text>
                    <View style={s.card}>
                      {(Object.keys(emptyProfile) as (keyof Profile)[]).map(
                        (k) => (
                          <View key={k}>
                            <Text style={s.fieldLabel}>{t[k]}</Text>
                            <TextInput
                              accessibilityLabel={t[k]}
                              editable={!busy}
                              style={[
                                s.input,
                                k === "address" && { height: 90 },
                              ]}
                              multiline={k === "address"}
                              value={profile[k]}
                              onChangeText={(v) =>
                                setProfile({ ...profile, [k]: v })
                              }
                            />
                          </View>
                        ),
                      )}
                      <Button
                        label={t.save}
                        onPress={() =>
                          void run(async () => {
                            await api("profile", "PUT", profile);
                            setNotice(t.saved);
                          })
                        }
                      />
                    </View>
                    <Button
                      label={t.logout}
                      secondary
                      onPress={() =>
                        void run(async () => {
                          const { error } = await supabase!.auth.signOut();
                          if (error) throw error;
                          setProfile(emptyProfile);
                          setOrders([]);
                        })
                      }
                    />
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
        <View style={s.tabs}>
          {(["products", "cart", "orders", "account"] as const).map((k, i) => (
            <Pressable
              key={k}
              disabled={busy}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
              onPress={() => {
                setTab(k);
                setNotice("");
              }}
              style={s.tab}
            >
              <Text style={[s.tabIcon, tab === k && { color: "#183d36" }]}>
                {["▦", "▢", "≡", "○"][i]}
                {k === "cart" && cart.length
                  ? ` ${cart.reduce((n, l) => n + l.quantity, 0)}`
                  : ""}
              </Text>
              <Text
                style={[
                  s.tabText,
                  tab === k && { color: "#183d36", fontWeight: "700" },
                ]}
              >
                {t[k]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Modal
          visible={!!selected}
          animationType="slide"
          onRequestClose={() =>
            dimensionPreview ? setDimensionPreview(null) : setSelected(null)
          }
        >
          <SafeAreaView style={s.safe}>
            {dimensionPreview ? (
              <DimensionImageViewer
                uri={dimensionPreview.uri}
                label={dimensionPreview.label}
                onClose={() => setDimensionPreview(null)}
              />
            ) : (
              <ScrollView contentContainerStyle={s.content}>
                <Button
                  label={`← ${t.back}`}
                  secondary
                  onPress={() => setSelected(null)}
                />
                {selected && (
                  <>
                    <ScrollView horizontal pagingEnabled>
                      {selected.images.map((uri) => (
                        <Image
                          key={uri}
                          source={{ uri }}
                          style={{ width: 300, height: 250 }}
                          resizeMode="contain"
                        />
                      ))}
                    </ScrollView>
                    <Text style={s.title}>{selected.name}</Text>
                    <Text style={s.muted}>{selected.description}</Text>
                    <Text style={s.fieldLabel}>{t.quantity}</Text>
                    <TextInput
                      accessibilityLabel={t.quantity}
                      style={s.input}
                      keyboardType="number-pad"
                      value={quantity}
                      onChangeText={setQuantity}
                    />
                    {selected.variants.map((v) => (
                      <View key={v.id} style={s.card}>
                        <Text style={s.productTitle}>
                          {[v.sku, v.size, v.color].filter(Boolean).join(" · ")}
                        </Text>
                        {v.dimensionImageUrl && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View size image for ${v.size || v.sku}`}
                            onPress={() =>
                              setDimensionPreview({
                                uri: v.dimensionImageUrl!,
                                label: [v.size, v.sku]
                                  .filter(Boolean)
                                  .join(" · "),
                              })
                            }
                          >
                            <Image
                              source={{ uri: v.dimensionImageUrl }}
                              resizeMode="contain"
                              style={{
                                width: "100%",
                                height: 180,
                                backgroundColor: "#f7f6f2",
                              }}
                              accessibilityLabel={`Dimensions for ${v.size || v.sku}`}
                            />
                            <Text style={s.muted}>
                              Size image · Tap to enlarge
                            </Text>
                          </Pressable>
                        )}
                        <Text style={s.price}>
                          {v.price === null ? t.noPrice : money(v.price)} /{" "}
                          {v.unit}
                        </Text>
                        <Button
                          label={
                            v.stock === "out_of_stock" ? t.unavailable : t.add
                          }
                          disabled={
                            v.price === null || v.stock === "out_of_stock"
                          }
                          onPress={() => add(selected, v)}
                        />
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  catalogPage: { flex: 1, width: "100%", maxWidth: 700, alignSelf: "center" },
  catalogHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  catalogLayout: {
    flex: 1,
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#e0e3d9",
  },
  sidebar: {
    width: 100,
    backgroundColor: "#edf0e8",
    borderRightWidth: 1,
    borderColor: "#dce1d4",
  },
  sidebarHeading: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6c796b",
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sidebarContent: { paddingBottom: 20 },
  categoryItem: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    justifyContent: "center",
  },
  categorySelected: { backgroundColor: "#fff", borderLeftColor: "#183d36" },
  categoryText: { fontSize: 12, lineHeight: 18, color: "#6c796b" },
  categoryTextSelected: { color: "#183d36", fontWeight: "700" },
  catalogResults: { flex: 1 },
  catalogResultsContent: { padding: 14, gap: 14, paddingBottom: 30 },
  catalogCategoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#183d36",
  },
  catalogCard: { flexDirection: "column", minHeight: 0 },
  catalogImage: { width: "100%", height: 140 },
  catalogPhoto: { width: "100%", height: 140 },
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#f7f6f2" },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e5e6df",
  },
  brand: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#183d36",
  },
  tagline: { fontSize: 9, letterSpacing: 3, color: "#6d7973", marginTop: 5 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 7,
  },
  activeChip: { backgroundColor: "#183d36" },
  content: {
    padding: 20,
    gap: 15,
    paddingBottom: 35,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  hero: {
    backgroundColor: "#183d36",
    borderRadius: 5,
    padding: 26,
    minHeight: 260,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#c0cfac",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  headline: {
    fontSize: 35,
    lineHeight: 43,
    fontWeight: "600",
    color: "#faf8ec",
    marginVertical: 16,
  },
  intro: { color: "#d4ded5", fontSize: 13, lineHeight: 20, maxWidth: 300 },
  heroFooter: {
    color: "#a3b7a4",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 30,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d9ddd4",
    padding: 14,
    borderRadius: 6,
    fontSize: 15,
    color: "#183d36",
    marginVertical: 5,
  },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#d9ddd4",
    borderRadius: 22,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  section: { fontSize: 21, fontWeight: "600", color: "#183d36" },
  muted: { color: "#758078", fontSize: 13, lineHeight: 21 },
  product: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 7,
    overflow: "hidden",
    minHeight: 126,
    borderWidth: 1,
    borderColor: "#e5e6df",
  },
  productImage: { width: 108, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: 124 },
  placeholder: { fontSize: 28, color: "#7f8978", fontWeight: "200" },
  productInfo: { flex: 1, padding: 16, gap: 8 },
  eyebrowDark: {
    fontSize: 10,
    color: "#7c8576",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#203a32",
    lineHeight: 23,
  },
  price: { fontSize: 15, fontWeight: "700", color: "#183d36" },
  arrow: { alignSelf: "flex-end", padding: 14, fontSize: 21, color: "#183d36" },
  title: {
    fontSize: 30,
    fontWeight: "600",
    color: "#183d36",
    marginVertical: 8,
  },
  card: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e3d9",
    backgroundColor: "white",
    gap: 12,
  },
  button: {
    backgroundColor: "#183d36",
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: "center",
    marginVertical: 3,
  },
  secondary: { backgroundColor: "#e9ede3" },
  buttonText: { color: "white", fontSize: 14, fontWeight: "600" },
  empty: { textAlign: "center", padding: 35, color: "#758078" },
  step: {
    padding: 12,
    backgroundColor: "#edf0e8",
    borderRadius: 5,
    minWidth: 44,
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e3d9",
    paddingVertical: 12,
  },
  tab: { flex: 1, alignItems: "center", gap: 5 },
  tabIcon: { fontSize: 21, color: "#939a93" },
  tabText: { fontSize: 11, color: "#939a93" },
  notice: {
    backgroundColor: "#e7eddb",
    color: "#183d36",
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  preview: {
    backgroundColor: "#f2e6c8",
    textAlign: "center",
    padding: 8,
    color: "#735f34",
    fontSize: 11,
  },
  status: {
    fontSize: 11,
    color: "#183d36",
    backgroundColor: "#edf1e6",
    padding: 7,
    borderRadius: 4,
  },
  orderLine: {
    borderBottomWidth: 1,
    borderColor: "#edf0e9",
    paddingVertical: 10,
    gap: 4,
  },
  lineName: { fontSize: 14, color: "#203a32" },
  fieldLabel: { fontSize: 12, color: "#637064", fontWeight: "600" },
});
