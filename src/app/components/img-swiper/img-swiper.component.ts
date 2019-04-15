import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { IonSlides } from '@ionic/angular';
import * as L from 'leaflet';
import { GeoHazard } from '../../core/models/geo-hazard.enum';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-img-swiper',
  templateUrl: './img-swiper.component.html',
  styleUrls: ['./img-swiper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      state('*', style({
        opacity: 0
      })),
      state('show-label', style({
        opacity: 1
      })),
      transition('* => show-label', animate(`700ms 100ms ease-in`)),
    ]),
  ],
})

export class ImgSwiperComponent implements OnInit, OnChanges {

  @Input() imgUrl: string[] = [];
  @Input() showLabels = true;
  @Input() imgComments: string[] = [];
  @Input() imgHeaders: string[] = [];
  @Output() imgClick: EventEmitter<{ index: number, imgUrl: string }> = new EventEmitter();
  @Input() location: { latLng: L.LatLng, geoHazard: GeoHazard };
  @Output() locationClick: EventEmitter<{ latLng: L.LatLng, geoHazard: GeoHazard }> = new EventEmitter();

  slideOptions = {
    autoplay: false,
    slidesPerView: 'auto',
    zoom: false,
  };

  comment: string;
  header: string;
  imageIndex: number;
  loadedWithMap: boolean;
  swiper: any;
  swiperLoaded = false;
  recreateSwiper = false;
  state = '';

  @ViewChild(IonSlides) slider: IonSlides;

  get totalImages() {
    return this.imgUrl.length;
  }

  get showSingleImage() {
    return this.totalImages === 1 && !this.location;
  }

  get showSingleMap() {
    return this.location && this.totalImages === 0;
  }

  get showSlider() {
    return !this.showSingleImage && !this.showSingleMap;
  }

  get show() {
    return this.location || this.totalImages > 0;
  }

  get showImageIndex() {
    return this.imageIndex !== undefined && this.totalImages > 1;
  }

  get shouldShowLabel() {
    if (!this.showLabels) {
      return false;
    }
    return this.header !== undefined || this.comment !== undefined;
  }

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
  }

  slidesLoaded(el: any) {
    this.swiper = el.target.swiper;
    this.initSwiper();
    this.setImgHeaderAndComment(1);
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      this.resetImageHeaderAndComment();
      this.state = '';
      this.cdr.markForCheck();
      setTimeout(() => {
        if (this.showSlider) {
          this.reloadSwiper();
        } else {
          this.swiperLoaded = false;
          this.setImgHeaderAndComment(0);
        }
      });
    });
  }

  private reloadSwiper() {
    setTimeout(() => {
      this.swiperLoaded = false;
      this.recreateSwiper = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.recreateSwiper = false;
        this.cdr.markForCheck();
      }, 0);
    });
  }

  private initSwiper() {
    if (this.location) {
      if (this.swiper) {
        this.swiper.on('imagesReady', () => {
          this.moveMapInSwiperToLeftOutsideView();
        });
      }
      this.moveMapInSwiperToLeftOutsideView();
    }
    this.swiperLoaded = true;
    this.cdr.markForCheck();
  }

  private moveMapInSwiperToLeftOutsideView() {
    if (this.swiper && this.swiper.$wrapperEl && this.swiper.$wrapperEl[0]) {
      this.swiper.$wrapperEl[0].style.transform = 'translate3d(-60%, 0px, 0px)';
    }
  }

  private resetImageHeaderAndComment() {
    this.comment = undefined;
    this.header = undefined;
    this.imageIndex = undefined;
  }

  private setImgHeaderAndComment(index: number) {
    if (this.showLabels) {
      this.resetImageHeaderAndComment();
      const i = this.getImageIndex(index) - 1;
      if (this.location && index === 0) {
        this.header = 'REGISTRATION.OBS_LOCATION.TITLE';
      } else {
        if (i < this.imgComments.length) {
          this.comment = this.imgComments[i];
        }
        if (i < this.imgHeaders.length) {
          this.header = this.imgHeaders[i];
        }
        this.imageIndex = this.getImageIndex(index);
      }
      this.state = this.shouldShowLabel ? 'show-label' : '';
    }
    this.cdr.markForCheck();
  }

  private getImageIndex(index: number) {
    return (this.location ? (index - 1) : index) + 1;
  }

  onImageClick(index: number, imgUrl: string) {
    this.imgClick.emit({ index, imgUrl });
  }

  onLocationClick() {
    this.locationClick.emit(this.location);
  }

  async getSwiperIndex() {
    const index = await (this.slider ? this.slider.getActiveIndex() : Promise.resolve(0));
    const isEnd = await (this.slider ? this.slider.isEnd() : Promise.resolve(false));
    return isEnd ? (this.imgUrl.length - 1 + (this.location ? 1 : 0)) : index;
  }

  async onSlideTransitionEnd() {
    const index = await this.getSwiperIndex();
    this.setImgHeaderAndComment(index);
  }
}
