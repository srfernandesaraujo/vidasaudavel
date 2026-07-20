import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage, isFirebaseConfigured } from './firebase';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadRecipeImage(file: File, recipeId: string): Promise<string> {
  if (!isFirebaseConfigured || !storage || !auth?.currentUser) {
    throw new Error('É necessário estar logado com uma conta na nuvem para enviar imagens de receitas.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('A imagem é muito grande. Escolha um arquivo de até 5MB.');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `users/${auth.currentUser.uid}/recipe_images/${recipeId}-${Date.now()}.${extension}`;
  const imageRef = ref(storage, path);

  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
}
