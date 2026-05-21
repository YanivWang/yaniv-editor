# Media

Image and video are separate abilities.

```vue
<YanivEditor preset="basic" :upload-image="uploadImage" :upload-video="uploadVideo" />
```

Disable one without affecting the other:

```vue
<YanivEditor preset="full" :features="{ image: true, video: false }" />
```
