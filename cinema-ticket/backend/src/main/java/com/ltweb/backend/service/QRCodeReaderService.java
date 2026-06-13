package com.ltweb.backend.service;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.EnumMap;
import java.util.Map;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class QRCodeReaderService {

  public String decodeQRCode(MultipartFile file) {
    try {
      if (file.isEmpty()) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      // Chấp nhận tất cả image/* (png, jpg, webp, heic, gif, bmp...)
      String contentType = file.getContentType();
      if (contentType != null && !contentType.startsWith("image/")) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
      if (bufferedImage == null) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      // Thử decode ảnh gốc
      String decoded = tryDecode(bufferedImage);

      // Nếu thất bại, scale 2x (ảnh QR nhỏ, chụp xa)
      if (decoded == null) {
        decoded = tryDecode(scale(bufferedImage, 2.0));
      }

      // Nếu vẫn thất bại, scale 3x
      if (decoded == null) {
        decoded = tryDecode(scale(bufferedImage, 3.0));
      }

      if (decoded == null) {
        log.error("QR Code not found in image after 3 attempts");
        throw new AppException(ErrorCode.QR_CODE_NOT_FOUND);
      }

      log.info("QR Code decoded successfully: {}", decoded);
      return decoded;

    } catch (AppException e) {
      throw e;
    } catch (IOException e) {
      log.error("Error reading image file", e);
      throw new AppException(ErrorCode.INVALID_QR_IMAGE);
    }
  }

  private String tryDecode(BufferedImage image) {
    try {
      Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
      hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
      hints.put(DecodeHintType.ALSO_INVERTED, Boolean.TRUE);

      BinaryBitmap bitmap = new BinaryBitmap(
          new HybridBinarizer(new BufferedImageLuminanceSource(image)));
      Result result = new MultiFormatReader().decode(bitmap, hints);
      return result.getText();
    } catch (NotFoundException e) {
      return null; // thử lại với scale khác
    }
  }

  private BufferedImage scale(BufferedImage src, double factor) {
    int w = (int) (src.getWidth() * factor);
    int h = (int) (src.getHeight() * factor);
    BufferedImage scaled = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = scaled.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    g.drawImage(src, 0, 0, w, h, null);
    g.dispose();
    return scaled;
  }
}
