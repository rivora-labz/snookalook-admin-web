import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const apiFetchMock = vi.fn();
const apiFetchFormDataMock = vi.fn();

vi.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  apiFetchFormData: (...args: unknown[]) => apiFetchFormDataMock(...args),
  ApiError: class ApiError extends Error {},
}));

import { useCenterPhotos } from "./useCenterPhotos";

type Photo = { id: string; centerId: string; url: string; caption?: string | null; displayOrder: number };

const p = (id: string, order = 0, caption: string | null = null): Photo => ({
  id,
  centerId: "c-1",
  url: `https://cdn/${id}.jpg`,
  caption,
  displayOrder: order,
});

describe("useCenterPhotos", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchFormDataMock.mockReset();
  });

  it("initial state: empty photos, not loading, no error", () => {
    const { result } = renderHook(() => useCenterPhotos());
    expect(result.current.photos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetchPhotos populates photos and toggles loading", async () => {
    apiFetchMock.mockResolvedValue({ items: [p("a"), p("b")] });
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => {
      await result.current.fetchPhotos();
    });
    expect(result.current.photos.map((x) => x.id)).toEqual(["a", "b"]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/centers/me/photos");
  });

  it("fetchPhotos surfaces Error.message on failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => {
      await result.current.fetchPhotos();
    });
    expect(result.current.error).toBe("boom");
    expect(result.current.loading).toBe(false);
    expect(result.current.photos).toEqual([]);
  });

  it("fetchPhotos uses default message for non-Error rejection", async () => {
    apiFetchMock.mockRejectedValue("string-rejection");
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => {
      await result.current.fetchPhotos();
    });
    expect(result.current.error).toBe("Failed to load photos");
  });

  it("fetchPhotos clears prior error on retry success", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ items: [p("z")] });
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => { await result.current.fetchPhotos(); });
    expect(result.current.error).toBe("x");
    await act(async () => { await result.current.fetchPhotos(); });
    expect(result.current.error).toBeNull();
    expect(result.current.photos.map((x) => x.id)).toEqual(["z"]);
  });

  it("uploadPhoto appends returned photo and posts FormData with file", async () => {
    apiFetchFormDataMock.mockResolvedValue(p("new"));
    const { result } = renderHook(() => useCenterPhotos());
    const file = new File(["x"], "a.png", { type: "image/png" });
    await act(async () => {
      await result.current.uploadPhoto(file);
    });
    expect(result.current.photos.map((x) => x.id)).toEqual(["new"]);
    const call = apiFetchFormDataMock.mock.calls[0]!;
    expect(call[0]).toBe("/admin/centers/me/photos");
    const form = call[1] as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("caption")).toBeNull();
  });

  it("uploadPhoto includes caption when provided", async () => {
    apiFetchFormDataMock.mockResolvedValue(p("c"));
    const { result } = renderHook(() => useCenterPhotos());
    const file = new File(["x"], "a.png", { type: "image/png" });
    await act(async () => {
      await result.current.uploadPhoto(file, "Pretty table");
    });
    const form = apiFetchFormDataMock.mock.calls[0]![1] as FormData;
    expect(form.get("caption")).toBe("Pretty table");
  });

  it("uploadPhoto omits empty-string caption", async () => {
    apiFetchFormDataMock.mockResolvedValue(p("c"));
    const { result } = renderHook(() => useCenterPhotos());
    const file = new File(["x"], "a.png", { type: "image/png" });
    await act(async () => {
      await result.current.uploadPhoto(file, "");
    });
    const form = apiFetchFormDataMock.mock.calls[0]![1] as FormData;
    expect(form.get("caption")).toBeNull();
  });

  it("updatePhoto PATCHes with JSON body and replaces matching entry only", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [p("a", 1), p("b", 2)] })
      .mockResolvedValueOnce({ ...p("b", 2), caption: "updated" });
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => { await result.current.fetchPhotos(); });
    await act(async () => { await result.current.updatePhoto("b", { caption: "updated" }); });
    expect(result.current.photos.find((x) => x.id === "b")?.caption).toBe("updated");
    expect(result.current.photos.find((x) => x.id === "a")?.caption).toBeNull();
    const patchCall = apiFetchMock.mock.calls[1]!;
    expect(patchCall[0]).toBe("/admin/centers/me/photos/b");
    expect((patchCall[1] as RequestInit).method).toBe("PATCH");
    expect((patchCall[1] as RequestInit).body).toBe(JSON.stringify({ caption: "updated" }));
  });

  it("deletePhoto sends DELETE and removes from local state", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [p("a"), p("b"), p("c")] })
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useCenterPhotos());
    await act(async () => { await result.current.fetchPhotos(); });
    await act(async () => { await result.current.deletePhoto("b"); });
    expect(result.current.photos.map((x) => x.id)).toEqual(["a", "c"]);
    const delCall = apiFetchMock.mock.calls[1]!;
    expect(delCall[0]).toBe("/admin/centers/me/photos/b");
    expect((delCall[1] as RequestInit).method).toBe("DELETE");
  });

  it("loading becomes true during fetchPhotos in-flight", async () => {
    let resolve!: (v: { items: Photo[] }) => void;
    apiFetchMock.mockReturnValue(new Promise((res) => { resolve = res; }));
    const { result } = renderHook(() => useCenterPhotos());
    let pending!: Promise<void>;
    act(() => { pending = result.current.fetchPhotos(); });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      resolve({ items: [p("done")] });
      await pending;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.photos.map((x) => x.id)).toEqual(["done"]);
  });

  it("operations preserve callback identity across renders (useCallback)", () => {
    const { result, rerender } = renderHook(() => useCenterPhotos());
    const first = {
      fetch: result.current.fetchPhotos,
      upload: result.current.uploadPhoto,
      update: result.current.updatePhoto,
      del: result.current.deletePhoto,
    };
    rerender();
    expect(result.current.fetchPhotos).toBe(first.fetch);
    expect(result.current.uploadPhoto).toBe(first.upload);
    expect(result.current.updatePhoto).toBe(first.update);
    expect(result.current.deletePhoto).toBe(first.del);
  });
});
