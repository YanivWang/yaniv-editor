# Media

Image and video are separate abilities.

```vue
<YanivEditor preset="full" :upload-image="uploadImage" :upload-video="uploadVideo" />
<YanivEditor
  preset="basic"
  :features="{ video: true }"
  :upload-image="uploadImage"
  :upload-video="uploadVideo"
/>
```

Disable one without affecting the other:

```vue
<YanivEditor preset="full" :features="{ image: true, video: false }" />
```

`basic` enables image by default, but not video.
