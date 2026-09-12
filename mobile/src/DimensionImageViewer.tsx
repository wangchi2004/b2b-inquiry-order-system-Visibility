import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export function DimensionImageViewer({
  uri,
  label,
  onClose,
}: {
  uri: string;
  label: string;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [ratio, setRatio] = useState(1);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (active && w && h) setRatio(w / h);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [uri]);
  const imageWidth = Math.max(200, width - 40) * scale;
  return (
    <View style={{ flex: 1, padding: 20, gap: 15 }}>
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={{ padding: 14, backgroundColor: "#e9ede3", borderRadius: 6 }}
      >
        <Text>← Back to product</Text>
      </Pressable>
      <Text style={{ fontSize: 21, fontWeight: "600", color: "#183d36" }}>
        Size image · {label}
      </Text>
      <Text style={{ color: "#637064", lineHeight: 20 }}>
        Use the measurements marked on the image. Screen display is not
        life-size.
      </Text>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          disabled={scale <= 1}
          onPress={() => setScale(Math.max(1, scale - 0.5))}
          style={{ padding: 14, backgroundColor: "#e9ede3" }}
        >
          <Text>−</Text>
        </Pressable>
        <Text>{Math.round(scale * 100)}%</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          disabled={scale >= 4}
          onPress={() => setScale(Math.min(4, scale + 0.5))}
          style={{ padding: 14, backgroundColor: "#e9ede3" }}
        >
          <Text>＋</Text>
        </Pressable>
      </View>
      {failed ? (
        <Text>
          Unable to load the size image. Please go back and try again.
        </Text>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          <ScrollView horizontal>
            <Image
              accessibilityLabel={`Dimensions for ${label}`}
              source={{ uri }}
              onError={() => setFailed(true)}
              resizeMode="contain"
              style={{ width: imageWidth, height: imageWidth / ratio }}
            />
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}
